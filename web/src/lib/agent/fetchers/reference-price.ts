// Mirrored from /agent/src/fetchers/reference-price.ts.
const TWELVE_DATA_URL = 'https://api.twelvedata.com/price';

export interface ReferencePriceClient {
  fetchPrice(symbol: string): Promise<number>;
}

export function createTwelveDataClient(apiKey: string): ReferencePriceClient {
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
