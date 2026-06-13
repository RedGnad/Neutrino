// Mirrored from /agent/src/fetchers/xstocks.ts.
// IMPORTANT: this is stub data. Replace with real Fluxion DEX reads (R1 in SPEC.md)
// before any production demo.
import type { AssetSymbol, MarketSnapshot } from '../types';

export interface XStockClient {
  fetchSnapshot(asset: AssetSymbol, marketOpen: boolean, referencePrice?: number): Promise<MarketSnapshot>;
  /** Whether the snapshots are stub-derived. Surface this in the UI for honesty. */
  isStub(): boolean;
}

export function createMockXStockClient(): XStockClient {
  return {
    isStub: () => true,
    async fetchSnapshot(asset, marketOpen, referencePrice) {
      const base = MOCK_BASE[asset];
      const onChainPrice = referencePrice
        ? referencePrice * (1 + base.basisDriftPct)
        : base.fallbackPrice;
      return {
        asset,
        onChainPrice,
        referencePrice,
        spreadBps: marketOpen ? base.spreadOpen : base.spreadClosed,
        volume24hUsd: base.volume24hUsd,
        apy: base.apy,
        volatility24h: base.volatility,
        marketOpen,
        takenAt: Date.now(),
      };
    },
  };
}

interface MockBase {
  fallbackPrice: number;
  basisDriftPct: number;
  spreadOpen: number;
  spreadClosed: number;
  volume24hUsd: number;
  volatility: number;
  apy?: number;
}

const MOCK_BASE: Record<AssetSymbol, MockBase> = {
  NVDAx: { fallbackPrice: 950,  basisDriftPct: 0.003, spreadOpen: 15,  spreadClosed: 90,  volume24hUsd: 320_000,   volatility: 0.55 },
  TSLAx: { fallbackPrice: 245,  basisDriftPct: 0.004, spreadOpen: 18,  spreadClosed: 110, volume24hUsd: 180_000,   volatility: 0.70 },
  SPYx:  { fallbackPrice: 555,  basisDriftPct: 0.001, spreadOpen: 8,   spreadClosed: 40,  volume24hUsd: 480_000,   volatility: 0.18 },
  // SPCXx: SpaceX IPO'd June 12 2026 on NASDAQ (SPCX, opened $135, closed $161, +19%).
  // xStock trades 24/7 on Mantle; underlying only during NASDAQ hours.
  // First-day vol is extreme; on-chain token liquidity is thin (bridge just opened).
  SPCXx: { fallbackPrice: 155,  basisDriftPct: 0.008, spreadOpen: 120, spreadClosed: 220, volume24hUsd: 30_000,    volatility: 1.50 },
  USDY:  { fallbackPrice: 1.06, basisDriftPct: 0,     spreadOpen: 5,   spreadClosed: 5,   volume24hUsd: 2_500_000, volatility: 0.02, apy: 0.046 },
  mETH:  { fallbackPrice: 3300, basisDriftPct: 0,     spreadOpen: 8,   spreadClosed: 8,   volume24hUsd: 1_200_000, volatility: 0.55, apy: 0.038 },
  USDC:  { fallbackPrice: 1.0,  basisDriftPct: 0,     spreadOpen: 2,   spreadClosed: 2,   volume24hUsd: 8_000_000, volatility: 0.00 },
  USDT0: { fallbackPrice: 1.0,  basisDriftPct: 0,     spreadOpen: 3,   spreadClosed: 3,   volume24hUsd: 5_000_000, volatility: 0.00 },
};
