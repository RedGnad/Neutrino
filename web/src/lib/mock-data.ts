/**
 * Day-1 mock data. Replace with live reads from RWADecisionLogger events
 * (Mantle Sepolia) once contracts are deployed. Keep this file thin: shape only.
 */

export type AssetStatus = 'safe' | 'watch' | 'risk' | 'paused';

export interface AssetRow {
  symbol: string;
  reference?: string;
  kind: 'tokenized_equity' | 'yield_bearing' | 'stable';
  market?: 'NYSE' | 'NASDAQ' | 'none';
  marketOpen: boolean;
  onChainPrice: number;
  referencePrice?: number;
  spreadBps: number;
  volume24hUsd: number;
  apy?: number;
  riskScore: number;
  status: AssetStatus;
  action: 'ALLOCATE' | 'HOLD' | 'REDUCE' | 'PAUSE' | 'MOVE_TO_STABLE_YIELD' | 'REQUIRE_HUMAN_CONFIRMATION';
  reason: string;
}

export const MOCK_ASSETS: AssetRow[] = [
  {
    symbol: 'NVDAx',
    reference: 'NVDA',
    kind: 'tokenized_equity',
    market: 'NASDAQ',
    marketOpen: false,
    onChainPrice: 952.85,
    referencePrice: 950.0,
    spreadBps: 90,
    volume24hUsd: 320_000,
    riskScore: 720,
    status: 'paused',
    action: 'PAUSE',
    reason: 'NASDAQ market closed; spread elevated (90 bps); basis +0.30%; allocation paused per policy.',
  },
  {
    symbol: 'TSLAx',
    reference: 'TSLA',
    kind: 'tokenized_equity',
    market: 'NASDAQ',
    marketOpen: false,
    onChainPrice: 245.98,
    referencePrice: 245.0,
    spreadBps: 110,
    volume24hUsd: 180_000,
    riskScore: 760,
    status: 'paused',
    action: 'PAUSE',
    reason: 'NASDAQ closed; spread 110 bps; thin overnight liquidity ($180k 24h); paused.',
  },
  {
    symbol: 'SPYx',
    reference: 'SPY',
    kind: 'tokenized_equity',
    market: 'NYSE',
    marketOpen: false,
    onChainPrice: 555.55,
    referencePrice: 555.0,
    spreadBps: 40,
    volume24hUsd: 480_000,
    riskScore: 380,
    status: 'watch',
    action: 'HOLD',
    reason: 'NYSE closed but spread tight (40 bps); large 24h volume ($480k); held, not paused.',
  },
  {
    symbol: 'USDY',
    kind: 'yield_bearing',
    market: 'none',
    marketOpen: true,
    onChainPrice: 1.06,
    spreadBps: 5,
    volume24hUsd: 2_500_000,
    apy: 0.046,
    riskScore: 60,
    status: 'safe',
    action: 'ALLOCATE',
    reason: 'Stable yield; tight spread; idle xStock allocation moves here while equities are paused.',
  },
  {
    symbol: 'mETH',
    kind: 'yield_bearing',
    market: 'none',
    marketOpen: true,
    onChainPrice: 3300.4,
    spreadBps: 8,
    volume24hUsd: 1_200_000,
    apy: 0.038,
    riskScore: 220,
    status: 'safe',
    action: 'HOLD',
    reason: 'Healthy liquidity, mETH-native yield active; sized within policy cap.',
  },
];

export interface DecisionReceipt {
  id: string;
  asset: string;
  action: AssetRow['action'];
  riskScore: number;
  txHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
  reason: string;
}

export const MOCK_DECISIONS: DecisionReceipt[] = [
  {
    id: 'd-101',
    asset: 'NVDAx',
    action: 'PAUSE',
    riskScore: 720,
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000001',
    blockNumber: 12345678,
    timestamp: Date.now() - 1000 * 60 * 5,
    reason: 'NASDAQ closed; spread elevated; paused.',
  },
  {
    id: 'd-100',
    asset: 'USDY',
    action: 'ALLOCATE',
    riskScore: 60,
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000002',
    blockNumber: 12345677,
    timestamp: Date.now() - 1000 * 60 * 12,
    reason: 'Reallocate idle NVDAx position to USDY pending market reopen.',
  },
  {
    id: 'd-099',
    asset: 'SPYx',
    action: 'HOLD',
    riskScore: 380,
    txHash: '0xabc1230000000000000000000000000000000000000000000000000000000003',
    blockNumber: 12345670,
    timestamp: Date.now() - 1000 * 60 * 35,
    reason: 'NYSE closed, spread tight, large overnight volume — hold.',
  },
];

export const MOCK_VAULT_ALLOCATION = [
  { symbol: 'USDY', pct: 58, usd: 58_000 },
  { symbol: 'mETH', pct: 22, usd: 22_000 },
  { symbol: 'SPYx', pct: 15, usd: 15_000 },
  { symbol: 'USDC', pct: 5, usd: 5_000 },
];

export const STATUS_STYLES: Record<AssetStatus, { label: string; classes: string }> = {
  safe: { label: 'Safe', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  watch: { label: 'Watch', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  risk: { label: 'Risk', classes: 'bg-orange-50 text-orange-700 ring-orange-200' },
  paused: { label: 'Paused', classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
