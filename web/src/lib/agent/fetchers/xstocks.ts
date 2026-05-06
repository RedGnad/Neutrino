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
  NVDAx: { fallbackPrice: 950, basisDriftPct: 0.003, spreadOpen: 15, spreadClosed: 90, volume24hUsd: 320_000, volatility: 0.55 },
  TSLAx: { fallbackPrice: 245, basisDriftPct: 0.004, spreadOpen: 18, spreadClosed: 110, volume24hUsd: 180_000, volatility: 0.7 },
  AAPLx: { fallbackPrice: 195, basisDriftPct: 0.002, spreadOpen: 12, spreadClosed: 70, volume24hUsd: 250_000, volatility: 0.35 },
  METAx: { fallbackPrice: 540, basisDriftPct: 0.003, spreadOpen: 16, spreadClosed: 95, volume24hUsd: 140_000, volatility: 0.45 },
  GOOGLx: { fallbackPrice: 175, basisDriftPct: 0.002, spreadOpen: 13, spreadClosed: 75, volume24hUsd: 160_000, volatility: 0.4 },
  MSTRx: { fallbackPrice: 1450, basisDriftPct: 0.006, spreadOpen: 25, spreadClosed: 140, volume24hUsd: 90_000, volatility: 1.1 },
  HOODx: { fallbackPrice: 32, basisDriftPct: 0.004, spreadOpen: 20, spreadClosed: 110, volume24hUsd: 70_000, volatility: 0.65 },
  SPYx: { fallbackPrice: 555, basisDriftPct: 0.001, spreadOpen: 8, spreadClosed: 40, volume24hUsd: 480_000, volatility: 0.18 },
  QQQx: { fallbackPrice: 480, basisDriftPct: 0.002, spreadOpen: 9, spreadClosed: 45, volume24hUsd: 380_000, volatility: 0.22 },
  CRCLx: { fallbackPrice: 31, basisDriftPct: 0.005, spreadOpen: 22, spreadClosed: 130, volume24hUsd: 60_000, volatility: 0.5 },
  USDY:  { fallbackPrice: 1.06, basisDriftPct: 0,     spreadOpen: 5, spreadClosed: 5,  volume24hUsd: 2_500_000, volatility: 0.02, apy: 0.046 },
  mETH:  { fallbackPrice: 3300, basisDriftPct: 0,     spreadOpen: 8, spreadClosed: 8,  volume24hUsd: 1_200_000, volatility: 0.55, apy: 0.038 },
  USDe:  { fallbackPrice: 1.0,  basisDriftPct: 0,     spreadOpen: 4, spreadClosed: 4,  volume24hUsd: 4_000_000, volatility: 0.01, apy: 0.075 },
  sUSDe: { fallbackPrice: 1.12, basisDriftPct: 0,     spreadOpen: 6, spreadClosed: 6,  volume24hUsd: 800_000,   volatility: 0.02, apy: 0.075 },
  USDC:  { fallbackPrice: 1.0,  basisDriftPct: 0,     spreadOpen: 2, spreadClosed: 2,  volume24hUsd: 8_000_000, volatility: 0.0 },
  USDT0: { fallbackPrice: 1.0,  basisDriftPct: 0,     spreadOpen: 3, spreadClosed: 3,  volume24hUsd: 5_000_000, volatility: 0.0 },
};
