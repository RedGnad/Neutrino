import { describe, it, expect } from 'vitest';
import { buildCanonicalDecision, hashCanonicalJson } from './canonical';
import type { CanonicalBuildInput } from './canonical';

const BASE_EQUITY_INPUT: CanonicalBuildInput = {
  agentId: 1n,
  meta: {
    symbol: 'TSLAx',
    kind: 'tokenized_equity',
    reference: 'TSLA',
    address: '0x8aD3c73F833d3F9A523aB01476625F269aEB7Cf0',
    market: 'NASDAQ',
  },
  snapshot: {
    asset: 'TSLAx',
    onChainPrice: 250.0,
    referencePrice: 249.5,
    spreadBps: 80,
    volume24hUsd: 1_200_000,
    apy: undefined,
    volatility24h: 0.35,
    marketOpen: false,
    takenAt: 1_716_000_000_000,
  },
  breakdown: {
    marketHoursPenalty: 300,
    spreadPenalty: 40,
    liquidityPenalty: 20,
    basisPenalty: 10,
    volatilityPenalty: 30,
    total: 400,
  },
  policy: {
    name: 'No after-hours risk',
    blockAfterHoursEquity: true,
    maxRiskForAllocate: 350,
    fallbackYieldAsset: 'USDY',
  },
  aiProposal: {
    proposedAction: 'REDUCE',
    confidence: 0.6,
    rationale: 'PAUSE — after-hours equity, risk 400/1000.',
    model: 'deterministic',
  },
  policyReview: {
    finalAction: 'PAUSE',
    decision: 'OVERRIDE',
    overrideReason: 'Policy "No after-hours risk" blocks equity exposure outside market hours — PAUSE replaces the risk-based proposal.',
  },
  action: 'PAUSE',
  riskScore: 400,
  reason: 'PAUSE — after-hours equity, risk 400/1000.',
  sources: {
    marketHours: 'live',
    referencePrice: 'live',
    xStockPrice: 'live',
    xStockStatus: 'live',
    onChainWrite: 'live',
  },
  xstocks: {
    indicativePriceUsd: 250.0,
    priceSource: 'xstocks-public-api',
    marketTradingHalted: false,
    atomicTradingHalted: false,
  },
  narrationModel: null,
  narrationFromLlm: false,
  timestamp: 1_716_000_000_000,
};

describe('buildCanonicalDecision', () => {
  it('sets schema to neutrino.decision.v2', () => {
    const { decision } = buildCanonicalDecision(BASE_EQUITY_INPUT);
    expect(decision.schema).toBe('neutrino.decision.v2');
  });

  it('hash is stable across two builds with identical input', () => {
    const a = buildCanonicalDecision(BASE_EQUITY_INPUT);
    const b = buildCanonicalDecision(BASE_EQUITY_INPUT);
    expect(a.hash).toBe(b.hash);
    expect(a.json).toBe(b.json);
  });

  it('recomputed hash matches original hash', () => {
    const { json, hash } = buildCanonicalDecision(BASE_EQUITY_INPUT);
    expect(hashCanonicalJson(json)).toBe(hash);
  });

  it('hash mismatches when JSON is modified', () => {
    const { json, hash } = buildCanonicalDecision(BASE_EQUITY_INPUT);
    const tampered = json.replace('"PAUSE"', '"ALLOCATE"');
    expect(hashCanonicalJson(tampered)).not.toBe(hash);
  });

  it('includes xstocks block for TSLAx', () => {
    const { decision } = buildCanonicalDecision(BASE_EQUITY_INPUT);
    expect(decision.xstocks).not.toBeNull();
    expect(decision.xstocks?.indicativePriceUsd).toBe(250.0);
    expect(decision.xstocks?.priceSource).toBe('xstocks-public-api');
  });

  it('includes xstocks block for NVDAx', () => {
    const { decision } = buildCanonicalDecision({
      ...BASE_EQUITY_INPUT,
      meta: { ...BASE_EQUITY_INPUT.meta, symbol: 'NVDAx', reference: 'NVDA' },
    });
    expect(decision.xstocks).not.toBeNull();
  });

  it('includes xstocks block for SPYx', () => {
    const { decision } = buildCanonicalDecision({
      ...BASE_EQUITY_INPUT,
      meta: { ...BASE_EQUITY_INPUT.meta, symbol: 'SPYx', reference: 'SPY', market: 'NYSE' },
    });
    expect(decision.xstocks).not.toBeNull();
  });

  it('xStockPrice cannot be live when indicativePriceUsd is null', () => {
    const input: CanonicalBuildInput = {
      ...BASE_EQUITY_INPUT,
      sources: { ...BASE_EQUITY_INPUT.sources, xStockPrice: 'stub' },
      xstocks: { indicativePriceUsd: null, priceSource: null, marketTradingHalted: null, atomicTradingHalted: null },
    };
    const { decision } = buildCanonicalDecision(input);
    // The payload must reflect the stub source when price is null
    expect(decision.sources.xStockPrice).toBe('stub');
    expect(decision.xstocks?.indicativePriceUsd).toBeNull();
    // Crucially: should NOT be 'live' when indicativePriceUsd is null
    expect(decision.sources.xStockPrice).not.toBe('live');
  });

  it('xStockStatus cannot be live when status is null', () => {
    const input: CanonicalBuildInput = {
      ...BASE_EQUITY_INPUT,
      sources: { ...BASE_EQUITY_INPUT.sources, xStockStatus: 'stub' },
      xstocks: { indicativePriceUsd: 250, priceSource: 'xstocks-public-api', marketTradingHalted: null, atomicTradingHalted: null },
    };
    const { decision } = buildCanonicalDecision(input);
    expect(decision.sources.xStockStatus).toBe('stub');
    expect(decision.sources.xStockStatus).not.toBe('live');
  });

  it('xstocks is null for yield-bearing assets', () => {
    const { decision } = buildCanonicalDecision({
      ...BASE_EQUITY_INPUT,
      meta: { symbol: 'mETH', kind: 'yield_bearing', address: '0x0' as `0x${string}` },
      sources: { ...BASE_EQUITY_INPUT.sources, xStockPrice: 'n/a', xStockStatus: 'n/a', referencePrice: 'n/a' },
      xstocks: null,
    });
    expect(decision.xstocks).toBeNull();
    expect(decision.sources.xStockPrice).toBe('n/a');
  });

  it('policyHash is distinct from reasonHash', () => {
    const { hash, policyHash } = buildCanonicalDecision(BASE_EQUITY_INPUT);
    expect(policyHash).not.toBe(hash);
  });

  it('policyHash is stable across two builds with same policy', () => {
    const a = buildCanonicalDecision(BASE_EQUITY_INPUT);
    const b = buildCanonicalDecision({ ...BASE_EQUITY_INPUT, timestamp: 9_999_999_999_999 });
    expect(a.policyHash).toBe(b.policyHash);
  });
});
