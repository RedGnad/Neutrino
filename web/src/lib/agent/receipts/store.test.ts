import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keccak256, stringToBytes, type Hex } from 'viem';
import { getLatestReceipts, getReceiptByHash, saveReceipt } from './store';

const KV_ENV_KEYS = [
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

const originalEnv = new Map<string, string | undefined>();
const originalFetch = global.fetch;

function canonicalHash(json: string): Hex {
  return keccak256(stringToBytes(json));
}

function clearKvEnv(): void {
  for (const key of KV_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('receipt store', () => {
  beforeEach(() => {
    for (const key of KV_ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
    }
    clearKvEnv();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    for (const key of KV_ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originalEnv.clear();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('saves and retrieves a verified receipt from the memory fallback', async () => {
    const canonicalJson = JSON.stringify({ asset: 'TSLAx', finalAction: 'PAUSE', test: 'memory' });
    const reasonHash = canonicalHash(canonicalJson);

    const saved = await saveReceipt({
      txHash: '0xtest',
      blockNumber: '123',
      agentId: 1n,
      asset: 'TSLAx',
      action: 'PAUSE',
      riskScore: 82,
      canonicalJson,
      reasonHash,
    });

    const loaded = await getReceiptByHash(reasonHash);
    expect(loaded).toEqual(saved);
    expect(loaded?.verified).toBe(true);
    expect(loaded?.recomputedHash).toBe(reasonHash);
  });

  it('returns latest receipts newest first', async () => {
    const firstJson = JSON.stringify({ asset: 'USDY', finalAction: 'ALLOCATE', test: 'first' });
    const secondJson = JSON.stringify({ asset: 'mETH', finalAction: 'ALLOCATE', test: 'second' });

    await saveReceipt({
      txHash: '0xfirst',
      blockNumber: '124',
      agentId: 1n,
      asset: 'USDY',
      action: 'ALLOCATE',
      riskScore: 22,
      canonicalJson: firstJson,
      reasonHash: canonicalHash(firstJson),
    });

    const second = await saveReceipt({
      txHash: '0xsecond',
      blockNumber: '125',
      agentId: 1n,
      asset: 'mETH',
      action: 'ALLOCATE',
      riskScore: 18,
      canonicalJson: secondJson,
      reasonHash: canonicalHash(secondJson),
    });

    const latest = await getLatestReceipts(1);
    expect(latest).toHaveLength(1);
    expect(latest[0]).toEqual(second);
  });

  it('persists to Upstash-compatible REST when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-kv.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const kv = new Map<string, string>();
    const latest: string[] = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      const [op, key, value] = command;

      if (op === 'SET') {
        kv.set(key, value);
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }

      if (op === 'LPUSH') {
        latest.unshift(value);
        return new Response(JSON.stringify({ result: latest.length }), { status: 200 });
      }

      if (op === 'LTRIM') {
        latest.splice(Number(command[3]) + 1);
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }

      if (op === 'LRANGE') {
        return new Response(JSON.stringify({ result: latest.slice(0, Number(command[3]) + 1) }), { status: 200 });
      }

      if (op === 'GET') {
        return new Response(JSON.stringify({ result: kv.get(key) ?? null }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: 'unsupported command' }), { status: 400 });
    });
    global.fetch = fetchMock as typeof fetch;

    const canonicalJson = JSON.stringify({ asset: 'NVDAx', finalAction: 'REVIEW', test: 'kv' });
    const reasonHash = canonicalHash(canonicalJson);

    await saveReceipt({
      txHash: '0xkv',
      blockNumber: '126',
      agentId: 1n,
      asset: 'NVDAx',
      action: 'REVIEW',
      riskScore: 61,
      canonicalJson,
      reasonHash,
    });

    expect(kv.get(`neutrino:receipt:${reasonHash.toLowerCase()}`)).toContain('"asset":"NVDAx"');
    expect(latest[0]).toBe(reasonHash.toLowerCase());
    expect(fetchMock).toHaveBeenCalled();
  });
});
