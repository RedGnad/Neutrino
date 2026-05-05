import 'dotenv/config';
import type { Address, Hex } from 'viem';
import type { AssetMetadata, AssetSymbol, UserPolicy } from './types.ts';
import { decide } from './decision/decide.ts';
import { isUsMarketOpen } from './fetchers/market-hours.ts';
import { createMockXStockClient } from './fetchers/xstocks.ts';
import { createTwelveDataClient } from './fetchers/reference-price.ts';
import { createOnChainLogger } from './onchain/log-decision.ts';

/**
 * Day-1 entrypoint. Wires the pipeline end-to-end with mock on-chain data so
 * the team can iterate on each layer independently. Real Fluxion reads land in
 * `fetchers/xstocks.ts` once R1 (volume verification) is closed.
 */

const POLICY: UserPolicy = {
  name: 'No after-hours risk',
  blockAfterHoursEquity: true,
  maxRiskForAllocate: 350,
  fallbackYieldAsset: 'USDY',
};

// Placeholder — overwrite once contracts are deployed.
const ASSET_REGISTRY: Record<AssetSymbol, AssetMetadata> = {
  NVDAx:  { symbol: 'NVDAx',  kind: 'tokenized_equity', reference: 'NVDA',  address: '0x0000000000000000000000000000000000000001', market: 'NASDAQ' },
  TSLAx:  { symbol: 'TSLAx',  kind: 'tokenized_equity', reference: 'TSLA',  address: '0x0000000000000000000000000000000000000002', market: 'NASDAQ' },
  SPYx:   { symbol: 'SPYx',   kind: 'tokenized_equity', reference: 'SPY',   address: '0x0000000000000000000000000000000000000003', market: 'NYSE' },
  USDY:   { symbol: 'USDY',   kind: 'yield_bearing',                          address: '0x0000000000000000000000000000000000000004' },
  mETH:   { symbol: 'mETH',   kind: 'yield_bearing',                          address: '0x0000000000000000000000000000000000000005' },
  AAPLx:  { symbol: 'AAPLx',  kind: 'tokenized_equity', reference: 'AAPL',  address: '0x0', market: 'NASDAQ' },
  METAx:  { symbol: 'METAx',  kind: 'tokenized_equity', reference: 'META',  address: '0x0', market: 'NASDAQ' },
  GOOGLx: { symbol: 'GOOGLx', kind: 'tokenized_equity', reference: 'GOOGL', address: '0x0', market: 'NASDAQ' },
  MSTRx:  { symbol: 'MSTRx',  kind: 'tokenized_equity', reference: 'MSTR',  address: '0x0', market: 'NASDAQ' },
  HOODx:  { symbol: 'HOODx',  kind: 'tokenized_equity', reference: 'HOOD',  address: '0x0', market: 'NASDAQ' },
  QQQx:   { symbol: 'QQQx',   kind: 'tokenized_equity', reference: 'QQQ',   address: '0x0', market: 'NASDAQ' },
  CRCLx:  { symbol: 'CRCLx',  kind: 'tokenized_equity', reference: 'CRCL',  address: '0x0', market: 'NYSE' },
  USDe:   { symbol: 'USDe',   kind: 'yield_bearing',                          address: '0x0' },
  sUSDe:  { symbol: 'sUSDe',  kind: 'yield_bearing',                          address: '0x0' },
  USDC:   { symbol: 'USDC',   kind: 'stable',                                 address: '0x0' },
  USDT0:  { symbol: 'USDT0',  kind: 'stable',                                 address: '0x0' },
};

const MONITORED_ASSETS: AssetSymbol[] = ['NVDAx', 'TSLAx', 'SPYx', 'USDY', 'mETH'];

async function main() {
  const xstocks = createMockXStockClient();
  const refClient = process.env.TWELVE_DATA_API_KEY
    ? createTwelveDataClient(process.env.TWELVE_DATA_API_KEY)
    : null;

  const onChainEnabled = Boolean(
    process.env.DEPLOYER_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS &&
      process.env.MANTLE_SEPOLIA_RPC,
  );

  const logger = onChainEnabled
    ? createOnChainLogger({
        network: 'mantle_sepolia',
        rpcUrl: process.env.MANTLE_SEPOLIA_RPC!,
        privateKey: process.env.DEPLOYER_PRIVATE_KEY! as Hex,
        loggerAddress: process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS! as Address,
      })
    : null;

  const agentId = BigInt(process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ?? '1');
  const marketOpen = isUsMarketOpen();

  console.log(`[Neutrino] US market: ${marketOpen ? 'OPEN' : 'CLOSED'} | policy: ${POLICY.name}`);
  console.log(`[Neutrino] on-chain logging: ${onChainEnabled ? 'ENABLED' : 'DISABLED (set env)'}`);

  for (const symbol of MONITORED_ASSETS) {
    const meta = ASSET_REGISTRY[symbol];
    const ref =
      refClient && meta.reference
        ? await refClient.fetchPrice(meta.reference).catch((e) => {
            console.warn(`  ${symbol}: reference fetch failed (${(e as Error).message}) — using mock`);
            return undefined;
          })
        : undefined;

    const snapshot = await xstocks.fetchSnapshot(symbol, marketOpen, ref);
    const decision = decide({ meta, snapshot, policy: POLICY });

    console.log(
      `  ${symbol.padEnd(6)} | risk ${String(decision.riskScore).padStart(4)}/1000 → ${decision.action.padEnd(28)} | ${decision.reason}`,
    );

    if (logger) {
      try {
        const { txHash, blockNumber } = await logger.log(agentId, meta.address as Address, decision);
        console.log(`    tx: ${txHash} (block ${blockNumber})`);
      } catch (e) {
        console.warn(`    on-chain log failed: ${(e as Error).message}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
