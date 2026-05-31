/**
 * Read-only client for the public xStocks API (Backed Finance).
 *
 * Endpoints used — no authentication required (verified 2026-05-21):
 *   GET /public/assets/{symbol}/price-data  -> { quote: number }
 *   GET /public/system/status/{symbol}      -> { isMarketTradingHalted, isAtomicTradingHalted }
 *
 * Both api.xstocks.fi and api.backed.fi serve the same data; we try the
 * first and fall back to the second. xStock token contract addresses on
 * Mantle were resolved once from /public/assets/{symbol}
 * (deployments[network=Mantle].address) and are pinned as constants in
 * run.ts — there is no runtime metadata call.
 *
 * SCOPE / HONESTY: this client reads only the INDICATIVE PRICE and the
 * official TRADING STATUS. Order-book microstructure (spread, depth, 24h
 * volume) is NOT exposed by the public API and stays modelled — see the
 * honesty note in run.ts and the README. xStock RFQ *execution* (xChange)
 * is an authenticated channel and is not performed by this agent.
 */

const API_BASES = [
  'https://api.xstocks.fi/api/v2',
  'https://api.backed.fi/api/v2',
] as const;

const REQUEST_HEADERS = {
  accept: 'application/json',
  // A plain User-Agent — the API rejects some default library agents.
  'user-agent': 'Neutrino-RWA-Agent/1.0 (+https://neutrino-fawn.vercel.app)',
};

async function getJson<T>(path: string): Promise<T | null> {
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: REQUEST_HEADERS,
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // Network error / timeout — try the next base, then give up.
    }
  }
  return null;
}

export interface XStockLiveData {
  symbol: string;
  /** Indicative USD price from the xStocks public API, or null if unavailable. */
  indicativePrice: number | null;
  /** Official "underlying market halted" flag, or null if the status call failed. */
  marketTradingHalted: boolean | null;
  /** Official "atomic (RFQ) trading halted" flag, or null if the status call failed. */
  atomicTradingHalted: boolean | null;
  /** True when the indicative price was fetched live. */
  priceLive: boolean;
  /** True when the trading-status call succeeded. */
  statusLive: boolean;
}

/**
 * Fetch the indicative price (when available) and live trading status for one xStock.
 * Never throws — on any failure the corresponding field is null and the
 * caller falls back to the modelled snapshot, flagged `stub`.
 */
export async function fetchXStockLive(symbol: string): Promise<XStockLiveData> {
  const [price, status] = await Promise.all([
    getJson<{ quote: number | null }>(
      `/public/assets/${encodeURIComponent(symbol)}/price-data`,
    ),
    getJson<{ isMarketTradingHalted: boolean; isAtomicTradingHalted: boolean }>(
      `/public/system/status/${encodeURIComponent(symbol)}`,
    ),
  ]);

  const indicativePrice =
    price && typeof price.quote === 'number' && price.quote > 0 ? price.quote : null;

  return {
    symbol,
    indicativePrice,
    marketTradingHalted: status ? Boolean(status.isMarketTradingHalted) : null,
    atomicTradingHalted: status ? Boolean(status.isAtomicTradingHalted) : null,
    priceLive: indicativePrice != null,
    statusLive: status != null,
  };
}
