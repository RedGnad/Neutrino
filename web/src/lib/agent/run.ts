/**
 * Single-shot agent runner used by the /api/run-agent route.
 *
 * Honest by construction: returns flags telling the UI what was *actually*
 * live in the pipeline (market hours: yes; reference prices: only if
 * Twelve Data is configured; xStock prices: stub until Fluxion ABI lands).
 * The on-chain decision write is always real.
 */

import type { Address, Hex } from 'viem';
import type { AssetMetadata, AssetSymbol, UserPolicy } from './types';
import { decide } from './decision/decide';
import { isUsMarketOpen } from './fetchers/market-hours';
import { createMockXStockClient } from './fetchers/xstocks';
import { createTwelveDataClient } from './fetchers/reference-price';
import { createOnChainLogger } from './onchain/log-decision';

export const DEFAULT_POLICY: UserPolicy = {
  name: 'No after-hours risk',
  blockAfterHoursEquity: true,
  maxRiskForAllocate: 350,
  fallbackYieldAsset: 'USDY',
};

export const ASSET_REGISTRY: Record<AssetSymbol, AssetMetadata> = {
  NVDAx: { symbol: 'NVDAx', kind: 'tokenized_equity', reference: 'NVDA', address: '0x0000000000000000000000000000000000000001', market: 'NASDAQ' },
  TSLAx: { symbol: 'TSLAx', kind: 'tokenized_equity', reference: 'TSLA', address: '0x0000000000000000000000000000000000000002', market: 'NASDAQ' },
  SPYx:  { symbol: 'SPYx',  kind: 'tokenized_equity', reference: 'SPY',  address: '0x0000000000000000000000000000000000000003', market: 'NYSE' },
  USDY:  { symbol: 'USDY',  kind: 'yield_bearing',                          address: '0x0000000000000000000000000000000000000004' },
  mETH:  { symbol: 'mETH',  kind: 'yield_bearing',                          address: '0x0000000000000000000000000000000000000005' },
  AAPLx:  { symbol: 'AAPLx',  kind: 'tokenized_equity', reference: 'AAPL',  address: '0x0', market: 'NASDAQ' },
  METAx:  { symbol: 'METAx',  kind: 'tokenized_equity', reference: 'META',  address: '0x0', market: 'NASDAQ' },
  GOOGLx: { symbol: 'GOOGLx', kind: 'tokenized_equity', reference: 'GOOGL', address: '0x0', market: 'NASDAQ' },
  MSTRx:  { symbol: 'MSTRx',  kind: 'tokenized_equity', reference: 'MSTR',  address: '0x0', market: 'NASDAQ' },
  HOODx:  { symbol: 'HOODx',  kind: 'tokenized_equity', reference: 'HOOD',  address: '0x0', market: 'NASDAQ' },
  QQQx:   { symbol: 'QQQx',   kind: 'tokenized_equity', reference: 'QQQ',   address: '0x0', market: 'NASDAQ' },
  CRCLx:  { symbol: 'CRCLx',  kind: 'tokenized_equity', reference: 'CRCL',  address: '0x0', market: 'NYSE' },
  USDe:  { symbol: 'USDe',  kind: 'yield_bearing', address: '0x0' },
  sUSDe: { symbol: 'sUSDe', kind: 'yield_bearing', address: '0x0' },
  USDC:  { symbol: 'USDC',  kind: 'stable',         address: '0x0' },
  USDT0: { symbol: 'USDT0', kind: 'stable',         address: '0x0' },
};

export const MONITORED_ASSETS: AssetSymbol[] = ['NVDAx', 'TSLAx', 'SPYx', 'USDY', 'mETH'];

export interface PerAssetResult {
  symbol: AssetSymbol;
  action: string;
  riskScore: number;
  reason: string;
  txHash?: Hex;
  blockNumber?: string;
  error?: string;
}

export interface RunResult {
  startedAt: number;
  durationMs: number;
  marketOpen: boolean;
  /** Honest flags about the pipeline inputs. */
  inputs: {
    marketHoursLive: true;
    referencePricesLive: boolean;
    xStockPricesLive: boolean;
    onChainWriteLive: boolean;
  };
  policyName: string;
  results: PerAssetResult[];
}

export interface RunConfig {
  rpcUrl: string;
  privateKey: Hex;
  loggerAddress: Address;
  agentId: bigint;
  twelveDataApiKey?: string;
}

export async function runAgentOnce(cfg: RunConfig): Promise<RunResult> {
  const startedAt = Date.now();
  const marketOpen = isUsMarketOpen();
  const xstocks = createMockXStockClient();
  const refClient = cfg.twelveDataApiKey ? createTwelveDataClient(cfg.twelveDataApiKey) : null;
  const logger = createOnChainLogger({
    network: 'mantle_sepolia',
    rpcUrl: cfg.rpcUrl,
    privateKey: cfg.privateKey,
    loggerAddress: cfg.loggerAddress,
  });

  const results: PerAssetResult[] = [];

  for (const symbol of MONITORED_ASSETS) {
    const meta = ASSET_REGISTRY[symbol];
    let referencePrice: number | undefined;
    if (refClient && meta.reference) {
      try {
        referencePrice = await refClient.fetchPrice(meta.reference);
      } catch {
        referencePrice = undefined;
      }
    }
    const snapshot = await xstocks.fetchSnapshot(symbol, marketOpen, referencePrice);
    const decision = decide({ meta, snapshot, policy: DEFAULT_POLICY });

    const result: PerAssetResult = {
      symbol,
      action: decision.action,
      riskScore: decision.riskScore,
      reason: decision.reason,
    };

    try {
      const { txHash, blockNumber } = await logger.log(cfg.agentId, meta.address, decision);
      result.txHash = txHash;
      result.blockNumber = blockNumber.toString();
    } catch (e) {
      result.error = (e as Error).message.split('\n')[0];
    }

    results.push(result);
  }

  return {
    startedAt,
    durationMs: Date.now() - startedAt,
    marketOpen,
    inputs: {
      marketHoursLive: true,
      referencePricesLive: Boolean(refClient),
      xStockPricesLive: !xstocks.isStub(),
      onChainWriteLive: true,
    },
    policyName: DEFAULT_POLICY.name,
    results,
  };
}
