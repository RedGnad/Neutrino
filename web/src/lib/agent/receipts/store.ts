import { keccak256, stringToBytes, type Hex } from 'viem';

/**
 * Receipt store for the demo deployment.
 *
 * If Vercel KV / Upstash REST env vars are configured, receipts are persisted
 * durably by reasonHash. Otherwise the module falls back to a small in-memory
 * cache that survives across requests within one serverless instance.
 */

export interface PublicReceipt {
  schema: 'neutrino.decision.v2';
  txHash: string;
  blockNumber: string;
  agentId: string;
  asset: string;
  action: string;
  riskScore: number;
  canonicalJson: string;
  reasonHash: string;
  recomputedHash: string;
  verified: boolean;
  storedAt: number;
}

const MAX_RECEIPTS = 50;
const KV_TIMEOUT_MS = 1500;
const RECEIPT_KEY_PREFIX = 'neutrino:receipt:';
const LATEST_KEY = 'neutrino:receipts:latest';

// Module-level singleton fallback for deployments without durable KV.
const store = new Map<string, PublicReceipt>();
const order: string[] = [];

interface KvConfig {
  url: string;
  token: string;
}

interface KvResponse<T> {
  result?: T;
  error?: string;
}

function getKvConfig(): KvConfig | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    token,
  };
}

async function kvCommand<T>(command: unknown[]): Promise<T | null> {
  const config = getKvConfig();
  if (!config) {
    return null;
  }

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(KV_TIMEOUT_MS),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as KvResponse<T>;
    if (data.error) {
      return null;
    }

    return data.result ?? null;
  } catch {
    return null;
  }
}

function receiptKey(hash: string): string {
  return `${RECEIPT_KEY_PREFIX}${hash.toLowerCase()}`;
}

function rememberReceipt(receipt: PublicReceipt): void {
  const key = receipt.reasonHash.toLowerCase();
  if (!store.has(key)) {
    order.push(key);
    if (order.length > MAX_RECEIPTS) {
      const evicted = order.shift()!;
      store.delete(evicted);
    }
  }
  store.set(key, receipt);
}

function parseReceipt(value: unknown): PublicReceipt | null {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as PublicReceipt;
    } catch {
      return null;
    }
  }

  if (value && typeof value === 'object') {
    return value as PublicReceipt;
  }

  return null;
}

async function persistReceipt(receipt: PublicReceipt): Promise<void> {
  const hash = receipt.reasonHash.toLowerCase();
  await kvCommand(['SET', receiptKey(hash), JSON.stringify(receipt)]);
  await kvCommand(['LPUSH', LATEST_KEY, hash]);
  await kvCommand(['LTRIM', LATEST_KEY, 0, MAX_RECEIPTS - 1]);
}

export async function saveReceipt(params: {
  txHash: string;
  blockNumber: string;
  agentId: bigint;
  asset: string;
  action: string;
  riskScore: number;
  canonicalJson: string;
  reasonHash: Hex;
}): Promise<PublicReceipt> {
  const recomputedHash = keccak256(stringToBytes(params.canonicalJson));
  const verified = recomputedHash.toLowerCase() === params.reasonHash.toLowerCase();

  const receipt: PublicReceipt = {
    schema: 'neutrino.decision.v2',
    txHash: params.txHash,
    blockNumber: params.blockNumber,
    agentId: params.agentId.toString(),
    asset: params.asset,
    action: params.action,
    riskScore: params.riskScore,
    canonicalJson: params.canonicalJson,
    reasonHash: params.reasonHash,
    recomputedHash,
    verified,
    storedAt: Date.now(),
  };

  rememberReceipt(receipt);
  await persistReceipt(receipt);
  return receipt;
}

export async function getReceiptByHash(hash: string): Promise<PublicReceipt | null> {
  const normalizedHash = hash.toLowerCase();
  const cached = store.get(normalizedHash);
  if (cached) {
    return cached;
  }

  const persisted = parseReceipt(await kvCommand<string | PublicReceipt>(['GET', receiptKey(normalizedHash)]));
  if (persisted) {
    rememberReceipt(persisted);
  }

  return persisted;
}

/** Returns up to `limit` most-recent receipts, newest first. */
export async function getLatestReceipts(limit = 10): Promise<PublicReceipt[]> {
  const memoryReceipts = order
    .slice(-limit)
    .reverse()
    .map((k) => store.get(k)!)
    .filter(Boolean);

  const persistedHashes = await kvCommand<string[]>(['LRANGE', LATEST_KEY, 0, Math.max(limit * 2, limit) - 1]);
  if (!persistedHashes?.length) {
    return memoryReceipts.slice(0, limit);
  }

  const persistedReceipts = await Promise.all(
    persistedHashes.map((hash) => getReceiptByHash(hash)),
  );

  const loadedPersistedReceipts = persistedReceipts.filter(
    (receipt): receipt is PublicReceipt => receipt !== null,
  );

  const seen = new Set<string>();
  const merged = [...loadedPersistedReceipts, ...memoryReceipts].filter((receipt) => {
    const key = receipt.reasonHash.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return merged.slice(0, limit);
}
