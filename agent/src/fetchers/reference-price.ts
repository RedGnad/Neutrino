/**
 * Reference TradFi price feed. Day-1 picks Twelve Data because the free tier
 * grants 800 calls/day with no domestic-KYC requirement (vs Alpaca which gates
 * some endpoints). Swap to Alpaca/Polygon if we need lower latency in S3+.
 *
 * Sign-up needed J-1; smoke test: fetchReferencePrice('NVDA').
 */
const TWELVE_DATA_URL = 'https://api.twelvedata.com/price';

export interface ReferencePriceClient {
  fetchPrice(symbol: string): Promise<number>;
}

export function createTwelveDataClient(apiKey: string): ReferencePriceClient {
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY missing — sign up at https://twelvedata.com/');
  }
  return {
    async fetchPrice(symbol: string) {
      const url = `${TWELVE_DATA_URL}?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TwelveData ${symbol}: HTTP ${res.status}`);
      const json = (await res.json()) as { price?: string; status?: string; message?: string };
      if (json.status === 'error' || json.price === undefined) {
        throw new Error(`TwelveData ${symbol}: ${json.message ?? 'no price'}`);
      }
      const n = Number(json.price);
      if (!Number.isFinite(n)) throw new Error(`TwelveData ${symbol}: NaN price`);
      return n;
    },
  };
}
