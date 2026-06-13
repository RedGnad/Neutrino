// Mirrored from /agent/src/types.ts. Keep in sync until this gets factored
// into a shared workspace package.

// Only assets with a verified Mantle mainnet ERC-20 address are listed. The
// earlier roadmap placeholders (AAPLx/METAx/GOOGLx/MSTRx/HOODx/QQQx/CRCLx/
// USDe/sUSDe) were removed: they had 0x0 addresses and were never monitored,
// so keeping them only created a misleading "supported assets" surface.
export type AssetSymbol =
  | 'NVDAx'
  | 'TSLAx'
  | 'SPYx'
  | 'SPCXx'
  | 'USDY'
  | 'mETH'
  | 'USDC'
  | 'USDT0';

export type AssetKind = 'tokenized_equity' | 'yield_bearing' | 'stable';

export interface AssetMetadata {
  symbol: AssetSymbol;
  kind: AssetKind;
  reference?: string;
  address: `0x${string}`;
  market?: 'NYSE' | 'NASDAQ' | 'none';
}

export interface MarketSnapshot {
  asset: AssetSymbol;
  onChainPrice: number;
  referencePrice?: number;
  spreadBps: number;
  /**
   * LIVE sell-side price impact (bps) measured on-chain via Fluxion QuoterV2 at
   * notional size. Present only for assets with a real Fluxion pool (currently
   * mETH); undefined otherwise. When present it is preferred over the modelled
   * `spreadBps` for the execution-cost penalty — real on-chain depth beats a
   * hardcoded constant. `spreadBps` is still recorded for transparency.
   */
  priceImpactBps?: number;
  volume24hUsd: number;
  apy?: number;
  volatility24h: number;
  marketOpen: boolean;
  takenAt: number;
  /**
   * Official trading-halt flags from the xStocks public API (tokenized
   * equities only; undefined when the status call did not return).
   */
  tradingHalted?: boolean;
  atomicTradingHalted?: boolean;
}

export interface RiskBreakdown {
  marketHoursPenalty: number;
  spreadPenalty: number;
  liquidityPenalty: number;
  basisPenalty: number;
  volatilityPenalty: number;
  total: number;
}

export type Action =
  | 'ALLOCATE'
  | 'HOLD'
  | 'REDUCE'
  | 'PAUSE'
  | 'MOVE_TO_STABLE_YIELD'
  | 'REQUIRE_HUMAN_CONFIRMATION';

export const ACTION_TO_ENUM: Record<Action, number> = {
  ALLOCATE: 0,
  HOLD: 1,
  REDUCE: 2,
  PAUSE: 3,
  MOVE_TO_STABLE_YIELD: 4,
  REQUIRE_HUMAN_CONFIRMATION: 5,
};

export interface UserPolicy {
  name:
    | 'Conservative RWA'
    | 'Balanced RWA'
    | 'Growth xStocks'
    | 'No after-hours risk'
    | 'Yield-first';
  blockAfterHoursEquity: boolean;
  maxRiskForAllocate: number;
  fallbackYieldAsset: AssetSymbol;
}

/**
 * Output of the deterministic rules engine, BEFORE the canonical hash is
 * computed. `run.ts` then wraps this into a CanonicalDecision (see
 * decision/canonical.ts) and derives the on-chain hashes from that.
 */
export interface DecisionPlan {
  asset: AssetSymbol;
  action: Action;
  riskScore: number;
  breakdown: RiskBreakdown;
  reason: string;
}

/**
 * Decision shape used at the contract boundary — carries the hashes that
 * RWADecisionLogger.logDecision expects. Built from a DecisionPlan + the
 * canonical builder.
 */
export interface Decision extends DecisionPlan {
  reasonHash: `0x${string}`;
  policyHash: `0x${string}`;
}
