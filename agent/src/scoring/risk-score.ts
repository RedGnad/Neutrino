import type { AssetMetadata, MarketSnapshot, RiskBreakdown } from '../types.ts';

/**
 * Deterministic V1 risk score. Total in 0..1000.
 *
 * Each penalty is bounded; basis penalty uses a rolling-mean-deviation model — see
 * SPEC.md R2: we do NOT model `basis = onChain - reference == 0` as the truth, since
 * xStocks are collateralized tracker certificates and basis drifts legitimately
 * (fees, redemption, jurisdictional premium). Caller passes a recent rolling mean
 * and standard deviation of the basis in `basisStats`; we penalize deviations beyond 2σ.
 */
export interface BasisStats {
  /** Rolling mean of (onChainPrice - referencePrice) over recent window (e.g. 7d). */
  mean: number;
  /** Standard deviation of the same series. */
  stddev: number;
}

export interface ScoreInput {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  basisStats?: BasisStats;
}

export function computeRiskScore({ meta, snapshot, basisStats }: ScoreInput): RiskBreakdown {
  const marketHoursPenalty = computeMarketHoursPenalty(meta, snapshot);
  const spreadPenalty = computeSpreadPenalty(snapshot.spreadBps);
  const liquidityPenalty = computeLiquidityPenalty(snapshot.volume24hUsd);
  const basisPenalty = computeBasisPenalty(snapshot, basisStats);
  const volatilityPenalty = computeVolatilityPenalty(snapshot.volatility24h);

  const total = clamp(
    marketHoursPenalty + spreadPenalty + liquidityPenalty + basisPenalty + volatilityPenalty,
    0,
    1000,
  );

  return { marketHoursPenalty, spreadPenalty, liquidityPenalty, basisPenalty, volatilityPenalty, total };
}

function computeMarketHoursPenalty(meta: AssetMetadata, snap: MarketSnapshot): number {
  if (meta.kind !== 'tokenized_equity') return 0;
  return snap.marketOpen ? 0 : 250;
}

function computeSpreadPenalty(spreadBps: number): number {
  if (spreadBps <= 10) return 0;
  if (spreadBps <= 30) return 50;
  if (spreadBps <= 80) return 120;
  return 200;
}

function computeLiquidityPenalty(volume24hUsd: number): number {
  if (volume24hUsd >= 1_000_000) return 0;
  if (volume24hUsd >= 250_000) return 60;
  if (volume24hUsd >= 50_000) return 120;
  return 200;
}

function computeBasisPenalty(snap: MarketSnapshot, stats?: BasisStats): number {
  if (snap.referencePrice === undefined) return 0;
  const basis = snap.onChainPrice - snap.referencePrice;

  // No history yet — fall back to relative deviation, generous tolerance.
  if (!stats || stats.stddev === 0) {
    const relDev = Math.abs(basis) / snap.referencePrice;
    if (relDev <= 0.005) return 0; // < 50 bps
    if (relDev <= 0.02) return 60;
    if (relDev <= 0.05) return 120;
    return 200;
  }

  const z = Math.abs((basis - stats.mean) / stats.stddev);
  if (z <= 1) return 0;
  if (z <= 2) return 60;
  if (z <= 3) return 120;
  return 200;
}

function computeVolatilityPenalty(annualizedVol: number): number {
  if (annualizedVol <= 0.3) return 0;
  if (annualizedVol <= 0.6) return 50;
  if (annualizedVol <= 1.0) return 100;
  return 150;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
