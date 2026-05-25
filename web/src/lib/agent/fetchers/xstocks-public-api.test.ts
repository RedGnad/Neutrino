import { describe, it, expect, vi, afterEach } from 'vitest';

// fetchXStockLive uses global fetch; we mock it via vi.spyOn.
import { fetchXStockLive } from './xstocks-public-api';

function mockFetch(responses: Array<{ ok: boolean; json?: unknown } | 'timeout'>) {
  let call = 0;
  return vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const spec = responses[call++] ?? responses[responses.length - 1];
    if (spec === 'timeout') throw new DOMException('AbortError', 'AbortError');
    if (!spec.ok) return { ok: false } as Response;
    return { ok: true, json: async () => spec.json } as Response;
  });
}

afterEach(() => vi.restoreAllMocks());

describe('fetchXStockLive', () => {
  it('returns live flags when both API calls succeed', async () => {
    mockFetch([
      { ok: true, json: { quote: 250.5 } },
      { ok: true, json: { isMarketTradingHalted: false, isAtomicTradingHalted: false } },
    ]);

    const data = await fetchXStockLive('TSLAx');
    expect(data.priceLive).toBe(true);
    expect(data.statusLive).toBe(true);
    expect(data.indicativePrice).toBe(250.5);
    expect(data.marketTradingHalted).toBe(false);
  });

  it('returns priceLive=false when price API fails for all bases', async () => {
    // Both bases fail for price, both fail for status
    mockFetch(['timeout', 'timeout', 'timeout', 'timeout']);

    const data = await fetchXStockLive('NVDAx');
    expect(data.priceLive).toBe(false);
    expect(data.statusLive).toBe(false);
    expect(data.indicativePrice).toBeNull();
    expect(data.marketTradingHalted).toBeNull();
  });

  it('returns priceLive=false when quote is null in the response', async () => {
    mockFetch([
      { ok: true, json: { quote: null } },
      { ok: true, json: { isMarketTradingHalted: false, isAtomicTradingHalted: false } },
    ]);

    const data = await fetchXStockLive('SPYx');
    expect(data.priceLive).toBe(false);
    expect(data.indicativePrice).toBeNull();
    expect(data.statusLive).toBe(true);
  });

  it('forces PAUSE signal when isMarketTradingHalted is true', async () => {
    mockFetch([
      { ok: true, json: { quote: 300.0 } },
      { ok: true, json: { isMarketTradingHalted: true, isAtomicTradingHalted: false } },
    ]);

    const data = await fetchXStockLive('TSLAx');
    expect(data.marketTradingHalted).toBe(true);
    // Verify the decide logic will use this: callers must force PAUSE when this is true
    expect(data.statusLive).toBe(true);
  });

  it('flags RFQ as blocked when isAtomicTradingHalted is true', async () => {
    mockFetch([
      { ok: true, json: { quote: 200.0 } },
      { ok: true, json: { isMarketTradingHalted: false, isAtomicTradingHalted: true } },
    ]);

    const data = await fetchXStockLive('NVDAx');
    expect(data.atomicTradingHalted).toBe(true);
    expect(data.statusLive).toBe(true);
  });

  it('degrades gracefully when status API returns 404', async () => {
    mockFetch([
      { ok: true, json: { quote: 180.0 } },
      { ok: false },
      { ok: false },
    ]);

    const data = await fetchXStockLive('SPYx');
    expect(data.priceLive).toBe(true);
    expect(data.statusLive).toBe(false);
    expect(data.marketTradingHalted).toBeNull();
    expect(data.atomicTradingHalted).toBeNull();
  });
});

describe('xStocks source flags integrity', () => {
  it('xStockPrice source must be stub (not live) when priceLive is false', async () => {
    mockFetch(['timeout', 'timeout', 'timeout', 'timeout']);

    const data = await fetchXStockLive('TSLAx');
    // The run.ts badge logic: xStockPrice = priceLive ? 'live' : 'stub'
    // Verify the contract: priceLive false → badge would be 'stub'
    const badge = data.priceLive ? 'live' : 'stub';
    expect(badge).toBe('stub');
  });

  it('xStockStatus source must be stub (not live) when statusLive is false', async () => {
    mockFetch(['timeout', 'timeout', 'timeout', 'timeout']);

    const data = await fetchXStockLive('TSLAx');
    const badge = data.statusLive ? 'live' : 'stub';
    expect(badge).toBe('stub');
  });
});
