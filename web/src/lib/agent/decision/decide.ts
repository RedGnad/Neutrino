// Mirrored from /agent/src/decision/decide.ts.
import type { Action, AssetMetadata, Decision, MarketSnapshot, UserPolicy } from '../types';
import { computeRiskScore, type BasisStats } from '../scoring/risk-score';
import { keccak256, stringToBytes } from 'viem';

export interface DecideInput {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  policy: UserPolicy;
  basisStats?: BasisStats;
  reason?: string;
}

export function decide({ meta, snapshot, policy, basisStats, reason }: DecideInput): Decision {
  const breakdown = computeRiskScore({ meta, snapshot, basisStats });
  const action = pickAction(meta, snapshot, policy, breakdown.total);

  const explanation = reason ?? buildFallbackReason(meta, snapshot, breakdown.total, action);
  const reasonPayload = JSON.stringify({ breakdown, snapshot, reason: explanation });

  return {
    asset: meta.symbol,
    action,
    riskScore: breakdown.total,
    breakdown,
    reason: explanation,
    reasonHash: keccak256(stringToBytes(reasonPayload)),
    policyHash: keccak256(stringToBytes(JSON.stringify(policy))),
  };
}

function pickAction(meta: AssetMetadata, snap: MarketSnapshot, policy: UserPolicy, risk: number): Action {
  if (meta.kind === 'tokenized_equity' && !snap.marketOpen && policy.blockAfterHoursEquity) {
    return 'PAUSE';
  }

  if (risk >= 800) return 'REQUIRE_HUMAN_CONFIRMATION';
  if (risk >= 600) return meta.kind === 'tokenized_equity' ? 'PAUSE' : 'REDUCE';
  if (risk >= 400) return 'REDUCE';
  if (risk >= policy.maxRiskForAllocate) return 'HOLD';

  if (policy.name === 'Yield-first' && meta.kind === 'tokenized_equity' && risk >= 200) {
    return 'MOVE_TO_STABLE_YIELD';
  }

  return 'ALLOCATE';
}

function buildFallbackReason(meta: AssetMetadata, snap: MarketSnapshot, risk: number, action: Action): string {
  const parts: string[] = [];
  if (meta.kind === 'tokenized_equity') {
    parts.push(`${meta.market ?? 'underlying'} market is ${snap.marketOpen ? 'open' : 'closed'}`);
  }
  parts.push(`spread ${snap.spreadBps}bps`);
  parts.push(`24h volume $${formatUsd(snap.volume24hUsd)}`);
  if (snap.referencePrice !== undefined) {
    const dev = ((snap.onChainPrice - snap.referencePrice) / snap.referencePrice) * 100;
    parts.push(`basis ${dev >= 0 ? '+' : ''}${dev.toFixed(2)}%`);
  }
  parts.push(`vol(annual) ${(snap.volatility24h * 100).toFixed(0)}%`);
  return `${action} — risk score ${risk}/1000. ${parts.join('; ')}.`;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}
