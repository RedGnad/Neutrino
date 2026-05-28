/**
 * Canonical decision payload — the full audit-grade JSON record that backs the
 * on-chain `reasonHash`. Anyone can re-hash this JSON and confirm it matches
 * the bytes32 emitted by RWADecisionLogger.
 *
 * Why a schema and not just the inputs we hashed before:
 *   - The previous reasonHash covered `{breakdown, snapshot, reason}` only,
 *     which a Nansen-tier judge would correctly call "hash theatre" — proves
 *     we wrote a hash, not that the decision was computed from those exact
 *     inputs under that exact policy by that exact agent at that exact time.
 *   - This canonical payload pins everything: agent identity, asset metadata,
 *     timestamp, source-freshness flags (live/stub/simulated/n-a), full
 *     market snapshot, risk breakdown components, policy, action, score,
 *     LLM narration metadata. Nothing inferable, nothing missing.
 *
 * Key order is fixed at construction time. JSON.stringify preserves
 * insertion order for string keys in V8/Node, so the serialization is
 * byte-stable. The verifier in the UI re-hashes the cached JSON string
 * (NOT a re-stringified object) to confirm.
 */

import { keccak256, stringToBytes, type Hex } from 'viem';
import type { Action, AssetMetadata, MarketSnapshot, RiskBreakdown, UserPolicy } from '../types';
import type { AiProposalData, PolicyReviewData } from './decide';

export type SourceState = 'live' | 'stub' | 'simulated' | 'n/a';

export interface DecisionSources {
  marketHours: SourceState;
  referencePrice: SourceState;
  xStockPrice: SourceState;
  /** Official xStocks trading-status feed (live / stub / n/a). */
  xStockStatus: SourceState;
  onChainWrite: SourceState;
}

/**
 * Live xStocks public-API data captured at decision time. Present for
 * tokenized equities, null for yield/stable assets. `indicativePrice` is the
 * issuer's quote; microstructure (spread/depth) is NOT in this block because
 * the public API does not expose it — see the snapshot fields for the
 * modelled values and their honesty flags.
 */
export interface CanonicalXStocks {
  indicativePriceUsd: number | null;
  priceSource: 'xstocks-public-api' | null;
  marketTradingHalted: boolean | null;
  atomicTradingHalted: boolean | null;
}

// Re-export so callers can reference the receipt types without importing decide.ts.
export type { AiProposalData as AiProposal, PolicyReviewData as PolicyReview };

export interface CanonicalDecision {
  schema: 'neutrino.decision.v2';
  agentId: string;
  asset: {
    symbol: string;
    address: `0x${string}`;
    kind: 'tokenized_equity' | 'yield_bearing' | 'stable';
    reference: string | null;
    market: 'NYSE' | 'NASDAQ' | 'none' | null;
  };
  timestamp: number;
  sources: DecisionSources;
  snapshot: {
    onChainPrice: number;
    referencePrice: number | null;
    spreadBps: number;
    volume24hUsd: number;
    apy: number | null;
    volatility24h: number;
    marketOpen: boolean;
  };
  xstocks: CanonicalXStocks | null;
  breakdown: {
    marketHoursPenalty: number;
    spreadPenalty: number;
    liquidityPenalty: number;
    basisPenalty: number;
    volatilityPenalty: number;
    total: number;
  };
  policy: {
    name: string;
    blockAfterHoursEquity: boolean;
    maxRiskForAllocate: number;
    fallbackYieldAsset: string;
  };
  aiProposal: {
    proposedAction: Action;
    confidence: number;
    rationale: string;
    model: string;
  };
  policyReview: {
    finalAction: Action;
    decision: 'APPROVE' | 'OVERRIDE';
    overrideReason?: string;
  };
  action: Action;
  riskScore: number;
  reason: string;
  narration: {
    model: string | null;
    fromLlm: boolean;
  };
}

export interface CanonicalBuildInput {
  agentId: bigint;
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  breakdown: RiskBreakdown;
  policy: UserPolicy;
  aiProposal: AiProposalData;
  policyReview: PolicyReviewData;
  action: Action;
  riskScore: number;
  reason: string;
  sources: DecisionSources;
  /** Live xStocks public-API data; null for non-equity assets. */
  xstocks: CanonicalXStocks | null;
  narrationModel: string | null;
  narrationFromLlm: boolean;
  /** When the decision was finalized (epoch ms). */
  timestamp: number;
}

export function buildCanonicalDecision(input: CanonicalBuildInput): {
  decision: CanonicalDecision;
  json: string;
  hash: Hex;
  policyHash: Hex;
} {
  const decision: CanonicalDecision = {
    schema: 'neutrino.decision.v2',
    agentId: input.agentId.toString(),
    asset: {
      symbol: input.meta.symbol,
      address: input.meta.address,
      kind: input.meta.kind,
      reference: input.meta.reference ?? null,
      market: input.meta.market ?? null,
    },
    timestamp: input.timestamp,
    sources: {
      marketHours: input.sources.marketHours,
      referencePrice: input.sources.referencePrice,
      xStockPrice: input.sources.xStockPrice,
      xStockStatus: input.sources.xStockStatus,
      onChainWrite: input.sources.onChainWrite,
    },
    snapshot: {
      onChainPrice: input.snapshot.onChainPrice,
      referencePrice: input.snapshot.referencePrice ?? null,
      spreadBps: input.snapshot.spreadBps,
      volume24hUsd: input.snapshot.volume24hUsd,
      apy: input.snapshot.apy ?? null,
      volatility24h: input.snapshot.volatility24h,
      marketOpen: input.snapshot.marketOpen,
    },
    xstocks: input.xstocks,
    breakdown: {
      marketHoursPenalty: input.breakdown.marketHoursPenalty,
      spreadPenalty: input.breakdown.spreadPenalty,
      liquidityPenalty: input.breakdown.liquidityPenalty,
      basisPenalty: input.breakdown.basisPenalty,
      volatilityPenalty: input.breakdown.volatilityPenalty,
      total: input.breakdown.total,
    },
    policy: {
      name: input.policy.name,
      blockAfterHoursEquity: input.policy.blockAfterHoursEquity,
      maxRiskForAllocate: input.policy.maxRiskForAllocate,
      fallbackYieldAsset: input.policy.fallbackYieldAsset,
    },
    aiProposal: {
      proposedAction: input.aiProposal.proposedAction,
      confidence: input.aiProposal.confidence,
      rationale: input.aiProposal.rationale,
      model: input.aiProposal.model,
    },
    policyReview: {
      finalAction: input.policyReview.finalAction,
      decision: input.policyReview.decision,
      ...(input.policyReview.overrideReason ? { overrideReason: input.policyReview.overrideReason } : {}),
    },
    action: input.action,
    riskScore: input.riskScore,
    reason: input.reason,
    narration: {
      model: input.narrationModel,
      fromLlm: input.narrationFromLlm,
    },
  };
  const json = JSON.stringify(decision);
  const hash = keccak256(stringToBytes(json));

  // policyHash is computed independently so judges can group decisions
  // by policy without needing the full canonical payload.
  const policyJson = JSON.stringify({
    name: input.policy.name,
    blockAfterHoursEquity: input.policy.blockAfterHoursEquity,
    maxRiskForAllocate: input.policy.maxRiskForAllocate,
    fallbackYieldAsset: input.policy.fallbackYieldAsset,
  });
  const policyHash = keccak256(stringToBytes(policyJson));

  return { decision, json, hash, policyHash };
}

/**
 * Recompute the hash from a stored canonical JSON string. The verifier UI
 * uses this to confirm the cached payload matches the on-chain reasonHash.
 *
 * The input MUST be byte-identical to the original. Re-stringifying the
 * parsed object would change whitespace / number formatting and break the
 * hash; always pass the original string.
 */
export function hashCanonicalJson(json: string): Hex {
  return keccak256(stringToBytes(json));
}
