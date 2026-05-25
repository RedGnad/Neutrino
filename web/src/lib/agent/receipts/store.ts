/**
 * In-memory receipt store for the demo deployment.
 * Holds the last MAX_RECEIPTS decision receipts so a judge can retrieve the
 * full canonical payload by reasonHash from any browser — not just the one
 * that triggered the run.
 *
 * For production: replace the Map with Vercel KV / Upstash.
 */

import { keccak256, stringToBytes, type Hex } from 'viem';

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

// Module-level singleton — survives across requests within one serverless
// instance. Acceptable for a demo; replace with KV for production.
const store = new Map<string, PublicReceipt>();
const order: string[] = [];

export function saveReceipt(params: {
  txHash: string;
  blockNumber: string;
  agentId: bigint;
  asset: string;
  action: string;
  riskScore: number;
  canonicalJson: string;
  reasonHash: Hex;
}): PublicReceipt {
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

  const key = params.reasonHash.toLowerCase();
  if (!store.has(key)) {
    order.push(key);
    if (order.length > MAX_RECEIPTS) {
      const evicted = order.shift()!;
      store.delete(evicted);
    }
  }
  store.set(key, receipt);
  return receipt;
}

export function getReceiptByHash(hash: string): PublicReceipt | null {
  return store.get(hash.toLowerCase()) ?? null;
}

/** Returns up to `limit` most-recent receipts, newest first. */
export function getLatestReceipts(limit = 10): PublicReceipt[] {
  return order
    .slice(-limit)
    .reverse()
    .map((k) => store.get(k)!)
    .filter(Boolean);
}
