/**
 * Single-shot agent runner used by the /api/run-agent route.
 *
 * Honest by construction: returns flags telling the UI what was *actually*
 * live in the pipeline (market hours / reference prices / xStock prices /
 * LLM reasoning / on-chain write / on-chain execution). Each flag flips
 * to true only when the underlying source actually delivered.
 */

import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantle, mantleSepoliaTestnet } from 'viem/chains';
import type { AssetMetadata, AssetSymbol, UserPolicy } from './types';
import { decide } from './decision/decide';
import { isUsMarketOpen } from './fetchers/market-hours';
import { createMockXStockClient } from './fetchers/xstocks';
import { createTwelveDataClient } from './fetchers/reference-price';
import { createOnChainLogger } from './onchain/log-decision';
import { narrateDecision, NARRATION_MODEL } from './llm/narrate';
import { swapExactInputSingle } from './onchain/fluxion';
import { supplyToInit, type InitSupplyMode } from './onchain/init-capital';
import { INIT_CAPITAL, MAINNET_TOKENS } from './onchain/mantle-mainnet';

export const DEFAULT_POLICY: UserPolicy = {
  name: 'No after-hours risk',
  blockAfterHoursEquity: true,
  maxRiskForAllocate: 350,
  fallbackYieldAsset: 'USDY',
};

export const ASSET_REGISTRY: Record<AssetSymbol, AssetMetadata> = {
  // Phase 2 — addresses below align with what the agent now writes for the
  // event topic. Equities still use placeholder addresses (xStock token
  // addresses on Mantle are not publicly indexed; see SPEC R3 / research
  // report). Stable / yield assets use the real Mantle mainnet addresses
  // so /market-map and /agent-decision can link to Mantlescan token pages.
  NVDAx: { symbol: 'NVDAx', kind: 'tokenized_equity', reference: 'NVDA', address: '0x0000000000000000000000000000000000000001', market: 'NASDAQ' },
  TSLAx: { symbol: 'TSLAx', kind: 'tokenized_equity', reference: 'TSLA', address: '0x0000000000000000000000000000000000000002', market: 'NASDAQ' },
  SPYx:  { symbol: 'SPYx',  kind: 'tokenized_equity', reference: 'SPY',  address: '0x0000000000000000000000000000000000000003', market: 'NYSE' },
  USDY:  { symbol: 'USDY',  kind: 'yield_bearing',                          address: MAINNET_TOKENS.USDY.address },
  mETH:  { symbol: 'mETH',  kind: 'yield_bearing',                          address: '0x0000000000000000000000000000000000000005' },
  AAPLx: { symbol: 'AAPLx', kind: 'tokenized_equity', reference: 'AAPL',  address: '0x0', market: 'NASDAQ' },
  METAx: { symbol: 'METAx', kind: 'tokenized_equity', reference: 'META',  address: '0x0', market: 'NASDAQ' },
  GOOGLx: { symbol: 'GOOGLx', kind: 'tokenized_equity', reference: 'GOOGL', address: '0x0', market: 'NASDAQ' },
  MSTRx: { symbol: 'MSTRx', kind: 'tokenized_equity', reference: 'MSTR',  address: '0x0', market: 'NASDAQ' },
  HOODx: { symbol: 'HOODx', kind: 'tokenized_equity', reference: 'HOOD',  address: '0x0', market: 'NASDAQ' },
  QQQx:  { symbol: 'QQQx',  kind: 'tokenized_equity', reference: 'QQQ',   address: '0x0', market: 'NASDAQ' },
  CRCLx: { symbol: 'CRCLx', kind: 'tokenized_equity', reference: 'CRCL',  address: '0x0', market: 'NYSE' },
  USDe:  { symbol: 'USDe',  kind: 'yield_bearing', address: '0x0' },
  sUSDe: { symbol: 'sUSDe', kind: 'yield_bearing', address: '0x0' },
  USDC:  { symbol: 'USDC',  kind: 'stable',         address: MAINNET_TOKENS.USDC.address },
  USDT0: { symbol: 'USDT0', kind: 'stable',         address: MAINNET_TOKENS.USDT0.address },
};

export const MONITORED_ASSETS: AssetSymbol[] = ['NVDAx', 'TSLAx', 'SPYx', 'USDY', 'mETH'];

export type ExecutionAction = 'allocate' | 'move-to-stable-yield';

export interface ExecutionConfig {
  /** Action to execute on-chain after the decision loop. */
  action: ExecutionAction;
  /** Amount of USDC (the input token) in base units. 1 USDC = 1_000_000. */
  amountUsdcBaseUnits: bigint;
  /** Slippage tolerance for swaps, in bps. Default 50. */
  slippageBps?: number;
  /** INIT supply mode override; only meaningful for `move-to-stable-yield`. */
  initSupplyMode?: InitSupplyMode;
}

export interface ExecutionResult {
  action: ExecutionAction;
  txHash: Hex;
  approveTxHash?: Hex;
  description: string;
  blockNumber: string;
}

export interface PerAssetResult {
  symbol: AssetSymbol;
  action: string;
  riskScore: number;
  reason: string;
  reasonFromLlm: boolean;
  txHash?: Hex;
  blockNumber?: string;
  error?: string;
}

export interface RunResult {
  startedAt: number;
  durationMs: number;
  marketOpen: boolean;
  /** Network the on-chain writes target. */
  network: 'mantle' | 'mantle_sepolia';
  /** Honest flags about the pipeline inputs. */
  inputs: {
    marketHoursLive: true;
    referencePricesLive: boolean;
    xStockPricesLive: boolean;
    onChainWriteLive: boolean;
    onChainExecutionLive: boolean;
    llmReasoningLive: boolean;
  };
  narrationModel?: string;
  policyName: string;
  results: PerAssetResult[];
  /** On-chain execution result (only present when ExecutionConfig was passed). */
  execution?: ExecutionResult;
  /** Plain-English error if execution was attempted but failed. */
  executionError?: string;
}

export interface RunConfig {
  /** Network for log writes. Set to 'mantle' for Phase 2 mainnet, 'mantle_sepolia' for legacy. */
  network: 'mantle' | 'mantle_sepolia';
  rpcUrl: string;
  privateKey: Hex;
  loggerAddress: Address;
  agentId: bigint;
  twelveDataApiKey?: string;
  /** When set, the runner executes one Fluxion swap or INIT supply after the decision loop. */
  execution?: ExecutionConfig;
}

export async function runAgentOnce(cfg: RunConfig): Promise<RunResult> {
  const startedAt = Date.now();
  const marketOpen = isUsMarketOpen();
  const xstocks = createMockXStockClient();
  const refClient = cfg.twelveDataApiKey ? createTwelveDataClient(cfg.twelveDataApiKey) : null;
  const logger = createOnChainLogger({
    network: cfg.network,
    rpcUrl: cfg.rpcUrl,
    privateKey: cfg.privateKey,
    loggerAddress: cfg.loggerAddress,
  });

  const results: PerAssetResult[] = [];
  let anyReferenceFetched = false;
  let anyLlmNarration = false;

  for (const symbol of MONITORED_ASSETS) {
    const meta = ASSET_REGISTRY[symbol];
    let referencePrice: number | undefined;
    if (refClient && meta.reference) {
      try {
        referencePrice = await refClient.fetchPrice(meta.reference);
        anyReferenceFetched = true;
      } catch {
        referencePrice = undefined;
      }
    }
    const snapshot = await xstocks.fetchSnapshot(symbol, marketOpen, referencePrice);

    const baseDecision = decide({ meta, snapshot, policy: DEFAULT_POLICY });
    const llmReason = await narrateDecision({
      meta,
      snapshot,
      breakdown: baseDecision.breakdown,
      action: baseDecision.action,
      policy: DEFAULT_POLICY,
    });
    const reasonFromLlm = Boolean(llmReason);
    if (reasonFromLlm) anyLlmNarration = true;

    const decision = llmReason
      ? decide({ meta, snapshot, policy: DEFAULT_POLICY, reason: llmReason })
      : baseDecision;

    const result: PerAssetResult = {
      symbol,
      action: decision.action,
      riskScore: decision.riskScore,
      reason: decision.reason,
      reasonFromLlm,
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

  // Phase 2 — on-chain execution (mainnet only, opt-in via cfg.execution).
  let execution: ExecutionResult | undefined;
  let executionError: string | undefined;

  if (cfg.execution && cfg.network === 'mantle') {
    try {
      execution = await runExecution(cfg);
    } catch (e) {
      executionError = (e as Error).message.split('\n')[0];
    }
  } else if (cfg.execution && cfg.network !== 'mantle') {
    executionError = 'Execution requested but network is not mainnet — skipped.';
  }

  return {
    startedAt,
    durationMs: Date.now() - startedAt,
    marketOpen,
    network: cfg.network,
    inputs: {
      marketHoursLive: true,
      referencePricesLive: anyReferenceFetched,
      xStockPricesLive: !xstocks.isStub(),
      onChainWriteLive: true,
      onChainExecutionLive: Boolean(execution),
      llmReasoningLive: anyLlmNarration,
    },
    narrationModel: anyLlmNarration ? NARRATION_MODEL : undefined,
    policyName: DEFAULT_POLICY.name,
    results,
    execution,
    executionError,
  };
}

/**
 * Builds a viem wallet/public client pair for Mantle mainnet and dispatches
 * either a Fluxion swap (ALLOCATE) or an INIT Capital supply (MOVE_TO_STABLE_YIELD).
 *
 * Throws on any error (caught by the caller and surfaced into RunResult.executionError).
 */
async function runExecution(cfg: RunConfig): Promise<ExecutionResult> {
  const exec = cfg.execution!;
  const account = privateKeyToAccount(cfg.privateKey);
  const transport = http(cfg.rpcUrl);
  const wallet = createWalletClient({ account, chain: mantle, transport });
  const pub = createPublicClient({ chain: mantle, transport });

  if (exec.action === 'allocate') {
    // ALLOCATE: swap USDC → WMNT (deepest AMM liquidity guaranteed) so the
    // demo doesn't get stuck on a missing pool. Switch to mETH later once
    // a pool is confirmed via findPoolFee.
    const result = await swapExactInputSingle(
      { pub, wallet, signer: account.address },
      {
        tokenIn: MAINNET_TOKENS.USDC.address,
        tokenOut: MAINNET_TOKENS.WMNT.address,
        amountIn: exec.amountUsdcBaseUnits,
        slippageBps: exec.slippageBps,
      },
    );
    return {
      action: 'allocate',
      txHash: result.txHash,
      approveTxHash: result.approveTxHash,
      blockNumber: result.blockNumber.toString(),
      description: `Swapped ${formatUsdc(exec.amountUsdcBaseUnits)} USDC → WMNT on Fluxion V3 (fee ${result.fee / 100} bps).`,
    };
  }

  // MOVE_TO_STABLE_YIELD: supply USDC directly to INIT's USDC pool. Future
  // refinement: swap USDC → USDY first, then supply to USDY pool for the
  // real Ondo T-bill yield. USDY pool requires an existing USDY balance,
  // which we don't have at run start.
  const result = await supplyToInit(
    { pub, wallet, signer: account.address },
    {
      token: MAINNET_TOKENS.USDC.address,
      pool: INIT_CAPITAL.pools.USDC,
      amount: exec.amountUsdcBaseUnits,
      mode: exec.initSupplyMode,
    },
  );
  return {
    action: 'move-to-stable-yield',
    txHash: result.txHash,
    approveTxHash: result.approveOrTransferTxHash !== ('0x' as Hex)
      ? result.approveOrTransferTxHash
      : undefined,
    blockNumber: result.blockNumber.toString(),
    description: `Supplied ${formatUsdc(exec.amountUsdcBaseUnits)} USDC to INIT Capital USDC pool (RWA-yield rail).`,
  };
}

function formatUsdc(baseUnits: bigint): string {
  const whole = baseUnits / 1_000_000n;
  const frac = (baseUnits % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '') || '0';
  return frac === '0' ? `${whole}` : `${whole}.${frac}`;
}
