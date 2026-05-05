export type AssetSymbol =
  | 'NVDAx'
  | 'TSLAx'
  | 'AAPLx'
  | 'METAx'
  | 'GOOGLx'
  | 'MSTRx'
  | 'HOODx'
  | 'SPYx'
  | 'QQQx'
  | 'CRCLx'
  | 'USDY'
  | 'mETH'
  | 'USDe'
  | 'sUSDe'
  | 'USDC'
  | 'USDT0';

export type AssetKind = 'tokenized_equity' | 'yield_bearing' | 'stable';

export interface AssetMetadata {
  symbol: AssetSymbol;
  kind: AssetKind;
  /** Underlying TradFi reference symbol (NVDA for NVDAx). undefined for non-equity. */
  reference?: string;
  /** On-chain address on Mantle. */
  address: `0x${string}`;
  /** Market the underlying trades on (NYSE, NASDAQ, none). */
  market?: 'NYSE' | 'NASDAQ' | 'none';
}

export interface MarketSnapshot {
  asset: AssetSymbol;
  /** Mid price on Fluxion (or the asset's primary venue). */
  onChainPrice: number;
  /** Reference price from TradFi feed (Twelve Data / Alpaca). undefined when irrelevant. */
  referencePrice?: number;
  /** Bid-ask spread in basis points. */
  spreadBps: number;
  /** 24h on-chain volume in USD. */
  volume24hUsd: number;
  /** Approx APY for yield assets, undefined otherwise. */
  apy?: number;
  /** Realized 24h volatility, annualized. */
  volatility24h: number;
  /** True iff the underlying TradFi market is currently open. */
  marketOpen: boolean;
  /** When this snapshot was taken (ms). */
  takenAt: number;
}

export interface RiskBreakdown {
  marketHoursPenalty: number;
  spreadPenalty: number;
  liquidityPenalty: number;
  basisPenalty: number;
  volatilityPenalty: number;
  total: number; // 0..1000
}

export type Action =
  | 'ALLOCATE'
  | 'HOLD'
  | 'REDUCE'
  | 'PAUSE'
  | 'MOVE_TO_STABLE_YIELD'
  | 'REQUIRE_HUMAN_CONFIRMATION';

/** Maps to RWADecisionLogger.Action enum (must stay in sync). */
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
  /** Disallow ALLOCATE on equities outside their market hours. */
  blockAfterHoursEquity: boolean;
  /** Hard cap risk score for ALLOCATE (above → HOLD or below). */
  maxRiskForAllocate: number;
  /** When PAUSEing equity, fallback target. */
  fallbackYieldAsset: AssetSymbol;
}

export interface Decision {
  asset: AssetSymbol;
  action: Action;
  riskScore: number;
  breakdown: RiskBreakdown;
  /** Human-readable explanation produced by the LLM, NOT used for the decision. */
  reason: string;
  /** Hash of the off-chain JSON `{breakdown, reason, snapshot}` for on-chain pinning. */
  reasonHash: `0x${string}`;
  /** Hash of the policy JSON. */
  policyHash: `0x${string}`;
}
