// Deterministic rules engine. Picks an action, computes a risk breakdown, and
// produces a fallback reason string. Does NOT compute the on-chain hash —
// that is the canonical builder's job (see canonical.ts) so the hash covers
// the full audit payload, not just the bits this function sees.
import type { Action, AssetKind, AssetMetadata, DecisionPlan, MarketSnapshot, UserPolicy } from '../types';
import { computeRiskScore, type BasisStats } from '../scoring/risk-score';

// ---------- Agent Responsibility Receipt helpers ----------

export interface AiProposalData {
  proposedAction: Action;
  /** 0–1 linear complement of riskScore: 1 = fully confident, 0 = maximum risk. */
  confidence: number;
  /** Final reason text (LLM narration if available, deterministic fallback otherwise). */
  rationale: string;
  /** Model identifier, or "deterministic" when the LLM was unavailable. */
  model: string;
}

export interface PolicyReviewData {
  finalAction: Action;
  decision: 'APPROVE' | 'OVERRIDE';
  /** Present only when decision = 'OVERRIDE'. */
  overrideReason?: string;
}

/**
 * Builds the aiProposal + policyReview blocks for the canonical receipt.
 *
 * The AI proposal is what the risk-score engine would suggest with no
 * policy guardrails (no halt signals, no after-hours block). The policy
 * review either approves that proposal or explains the override.
 */
export function buildAgentReceiptData(params: {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  policy: UserPolicy;
  riskScore: number;
  finalAction: Action;
  reason: string;
  reasonFromLlm: boolean;
  narrationModel: string | null;
}): { aiProposal: AiProposalData; policyReview: PolicyReviewData } {
  const { meta, snapshot, policy, riskScore, finalAction, reason, reasonFromLlm, narrationModel } = params;
  const proposedAction = computeRawAction(riskScore, meta.kind, policy);
  const confidence = parseFloat((1 - riskScore / 1000).toFixed(2));
  const isOverride = proposedAction !== finalAction;

  let overrideReason: string | undefined;
  if (isOverride) {
    if (meta.kind === 'tokenized_equity' && (snapshot.tradingHalted || snapshot.atomicTradingHalted)) {
      overrideReason =
        `xStocks API reports trading halted (marketTradingHalted=${snapshot.tradingHalted ?? 'n/a'}, ` +
        `atomicTradingHalted=${snapshot.atomicTradingHalted ?? 'n/a'}) — PAUSE is mandatory.`;
    } else if (meta.kind === 'tokenized_equity' && !snapshot.marketOpen && policy.blockAfterHoursEquity) {
      overrideReason =
        `Policy "${policy.name}" blocks equity exposure outside market hours — ` +
        `PAUSE replaces the risk-based proposal.`;
    } else {
      overrideReason = `Risk score ${riskScore}/1000 and policy rules require ${finalAction} instead of the risk-based proposal.`;
    }
  }

  return {
    aiProposal: {
      proposedAction,
      confidence,
      rationale: reason,
      model: reasonFromLlm && narrationModel ? narrationModel : 'deterministic',
    },
    policyReview: {
      finalAction,
      decision: isOverride ? 'OVERRIDE' : 'APPROVE',
      ...(overrideReason ? { overrideReason } : {}),
    },
  };
}

/**
 * Risk-score-only action — no halt signals, no after-hours policy block.
 * This is the "AI raw proposal" before the policy guardrails are applied.
 */
function computeRawAction(riskScore: number, kind: AssetKind, policy: UserPolicy): Action {
  if (riskScore >= 800) return 'REQUIRE_HUMAN_CONFIRMATION';
  if (riskScore >= 600) return kind === 'tokenized_equity' ? 'PAUSE' : 'REDUCE';
  if (riskScore >= 400) return 'REDUCE';
  if (riskScore >= policy.maxRiskForAllocate) return 'HOLD';
  return 'ALLOCATE';
}

// ----------------------------------------------------------

export interface DecideInput {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  policy: UserPolicy;
  basisStats?: BasisStats;
  /** Optional LLM-narrated reason. Falls back to a deterministic one liner. */
  reason?: string;
}

export function decide({ meta, snapshot, policy, basisStats, reason }: DecideInput): DecisionPlan {
  const breakdown = computeRiskScore({ meta, snapshot, basisStats });
  const action = pickAction(meta, snapshot, policy, breakdown.total);
  const explanation = reason ?? buildFallbackReason(meta, snapshot, breakdown.total, action);

  return {
    asset: meta.symbol,
    action,
    riskScore: breakdown.total,
    breakdown,
    reason: explanation,
  };
}

function pickAction(meta: AssetMetadata, snap: MarketSnapshot, policy: UserPolicy, risk: number): Action {
  // Official halt signal from the xStocks public API outranks everything:
  // if the issuer says trading is halted, the agent does not act.
  if (meta.kind === 'tokenized_equity' && (snap.tradingHalted || snap.atomicTradingHalted)) {
    return 'PAUSE';
  }

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
    if (snap.tradingHalted) parts.push('xStocks reports the underlying market halted');
    if (snap.atomicTradingHalted) parts.push('xStocks reports atomic (RFQ) trading halted');
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
