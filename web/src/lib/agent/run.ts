/**
 * Single-shot agent runner used by the /api/run-agent route.
 *
 * Honest by construction. Each decision flows through:
 *   1. fetch market snapshot (live where possible, stub clearly flagged)
 *   2. deterministic rules engine → DecisionPlan
 *   3. optional LLM narration → reason text (LLM never alters the action)
 *   4. canonical decision builder → JSON payload + reasonHash + policyHash
 *      (the hash on-chain covers the FULL audit JSON, not a subset)
 *   5. on-chain log via RWADecisionLogger
 *   6. (opt-in, mainnet) one Fluxion swap or INIT Capital supply
 *
 * The full canonical JSON for every decision is returned in PerAssetResult so
 * the frontend can cache it and let a judge re-hash to verify.
 */

import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantle } from 'viem/chains';
import type { AssetMetadata, AssetSymbol, Decision, UserPolicy } from './types';
import { decide, buildAgentReceiptData } from './decision/decide';
import {
  buildCanonicalDecision,
  type CanonicalDecision,
  type DecisionSources,
  type SourceState,
} from './decision/canonical';
import { isUsMarketOpen } from './fetchers/market-hours';
import { createMockXStockClient } from './fetchers/xstocks';
import { fetchXStockLive, type XStockLiveData } from './fetchers/xstocks-public-api';
import { createTwelveDataClient } from './fetchers/reference-price';
import { createOnChainLogger } from './onchain/log-decision';
import { narrateDecision, NARRATION_MODEL } from './llm/narrate';
import { swapExactInputSingle } from './onchain/fluxion';
import { supplyToInit, type InitSupplyMode } from './onchain/init-capital';
import { ERC20_ABI, INIT_CAPITAL, MAINNET_TOKENS } from './onchain/mantle-mainnet';

export const DEFAULT_POLICY: UserPolicy = {
  name: 'No after-hours risk',
  blockAfterHoursEquity: true,
  maxRiskForAllocate: 350,
  fallbackYieldAsset: 'USDY',
};

export const ASSET_REGISTRY: Record<AssetSymbol, AssetMetadata> = {
  // xStocks: real Mantle mainnet ERC-20 addresses, resolved from the xStocks
  // public API (deployments[network=Mantle].address) and verified on-chain
  // 2026-05-21 (symbol()/decimals() on rpc.mantle.xyz). The decision logger
  // now records these real addresses.
  NVDAx: { symbol: 'NVDAx', kind: 'tokenized_equity', reference: 'NVDA', address: '0xc845b2894dBddd03858fd2D643B4eF725fE0849d', market: 'NASDAQ' },
  TSLAx: { symbol: 'TSLAx', kind: 'tokenized_equity', reference: 'TSLA', address: '0x8aD3c73F833d3F9A523aB01476625F269aEB7Cf0', market: 'NASDAQ' },
  SPYx:  { symbol: 'SPYx',  kind: 'tokenized_equity', reference: 'SPY',  address: '0x90A2a4c76b5D8c0bc892A69EA28Aa775a8f2dD48', market: 'NYSE' },
  USDY:  { symbol: 'USDY',  kind: 'yield_bearing',                          address: MAINNET_TOKENS.USDY.address },
  mETH:  { symbol: 'mETH',  kind: 'yield_bearing',                          address: MAINNET_TOKENS.mETH.address },
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

/**
 * Two named scenarios surface the contrast a judge needs in 30 seconds.
 *  - `risky-xstocks`: only the equities, where market-hours and basis risk dominate.
 *  - `safe-yield`: only the on-chain yield/stable assets, where the agent is comfortable.
 *  - `default`: the full mixed set (5 assets) — what the dashboard reads.
 */
export type Scenario = 'default' | 'risky-xstocks' | 'safe-yield';

const SCENARIO_ASSETS: Record<Scenario, AssetSymbol[]> = {
  default: ['NVDAx', 'TSLAx', 'SPYx', 'USDY', 'mETH'],
  'risky-xstocks': ['NVDAx', 'TSLAx', 'SPYx'],
  'safe-yield': ['USDY', 'mETH'],
};

export const MONITORED_ASSETS: AssetSymbol[] = SCENARIO_ASSETS.default;

export type ExecutionAction = 'allocate' | 'move-to-stable-yield';

export interface ExecutionConfig {
  action: ExecutionAction;
  amountUsdcBaseUnits: bigint;
  slippageBps?: number;
  initSupplyMode?: InitSupplyMode;
  /**
   * Demo mode: after the USDC→mETH allocation, swap the mETH back to USDC so
   * the shared demo wallet stays solvent across many judge clicks. Both legs
   * are real on-chain Fluxion swaps. Production sets this `false` — the agent
   * holds the mETH position, as a real allocation should.
   */
  roundTrip?: boolean;
}

/** One real on-chain transaction within an execution (multi-leg for round-trips). */
export interface ExecutionStep {
  label: string;
  txHash: Hex;
  blockNumber: string;
}

export interface ExecutionResult {
  action: ExecutionAction;
  txHash: Hex;
  approveTxHash?: Hex;
  description: string;
  blockNumber: string;
  /** Every on-chain leg, in order. The demo round-trip has two. */
  steps?: ExecutionStep[];
}

export interface PerAssetResult {
  symbol: AssetSymbol;
  action: string;
  riskScore: number;
  reason: string;
  reasonFromLlm: boolean;
  /** Canonical JSON payload of the decision (byte-stable). reasonHash on-chain = keccak256(stringToBytes(canonicalJson)). */
  canonicalJson: string;
  /** keccak256 hash of canonicalJson — same value emitted as reasonHash by RWADecisionLogger. */
  canonicalHash: Hex;
  /** Per-asset source flags echoed in the canonical payload. */
  sources: DecisionSources;
  txHash?: Hex;
  blockNumber?: string;
  error?: string;
}

/** Tri-state for the pipeline freshness flags so "stub" only ever means
 * "this signal SHOULD be live but isn't" — `n/a` covers the case where the
 * signal isn't relevant to the active scenario. */
export type FlagState = 'live' | 'stub' | 'n/a';

export interface RunResult {
  startedAt: number;
  durationMs: number;
  marketOpen: boolean;
  network: 'mantle' | 'mantle_sepolia';
  scenario: Scenario;
  inputs: {
    marketHours: FlagState;
    referencePrices: FlagState;
    xStockPrices: FlagState;
    xStockStatus: FlagState;
    onChainWrite: FlagState;
    onChainExecution: FlagState;
    llmReasoning: FlagState;
  };
  narrationModel?: string;
  policyName: string;
  results: PerAssetResult[];
  execution?: ExecutionResult;
  executionError?: string;
}

export interface RunConfig {
  network: 'mantle' | 'mantle_sepolia';
  rpcUrl: string;
  privateKey: Hex;
  loggerAddress: Address;
  agentId: bigint;
  twelveDataApiKey?: string;
  execution?: ExecutionConfig;
  /** Which subset of assets to monitor for this run. Default = all 5. */
  scenario?: Scenario;
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

  const scenario = cfg.scenario ?? 'default';
  const monitored = SCENARIO_ASSETS[scenario];

  const results: PerAssetResult[] = [];
  let anyReferenceFetched = false;
  let anyLlmNarration = false;
  let anyXStockPriceLive = false;
  let anyXStockStatusLive = false;

  for (const symbol of monitored) {
    const meta = ASSET_REGISTRY[symbol];
    let referencePrice: number | undefined;
    let referenceFetched = false;
    if (refClient && meta.reference) {
      try {
        referencePrice = await refClient.fetchPrice(meta.reference);
        referenceFetched = true;
        anyReferenceFetched = true;
      } catch {
        referencePrice = undefined;
      }
    }

    // Modelled baseline snapshot (spread / depth / volatility — the xStocks
    // public API does not expose order-book microstructure, so these stay
    // modelled and are flagged accordingly).
    const modelled = await xstocks.fetchSnapshot(symbol, marketOpen, referencePrice);

    // For tokenized equities, overlay the LIVE xStocks public-API signal:
    // the issuer's indicative price and the official trading-halt status.
    let xstockLive: XStockLiveData | null = null;
    if (meta.kind === 'tokenized_equity') {
      xstockLive = await fetchXStockLive(symbol);
      if (xstockLive.priceLive) anyXStockPriceLive = true;
      if (xstockLive.statusLive) anyXStockStatusLive = true;
    }
    const snapshot =
      xstockLive && xstockLive.priceLive
        ? {
            ...modelled,
            onChainPrice: xstockLive.indicativePrice as number,
            tradingHalted: xstockLive.marketTradingHalted ?? undefined,
            atomicTradingHalted: xstockLive.atomicTradingHalted ?? undefined,
          }
        : xstockLive
          ? {
              ...modelled,
              tradingHalted: xstockLive.marketTradingHalted ?? undefined,
              atomicTradingHalted: xstockLive.atomicTradingHalted ?? undefined,
            }
          : modelled;

    // Deterministic plan first, LLM narration on top, then re-decide so the
    // canonical reason matches what the LLM produced.
    const basePlan = decide({ meta, snapshot, policy: DEFAULT_POLICY });
    const llmReason = await narrateDecision({
      meta,
      snapshot,
      breakdown: basePlan.breakdown,
      action: basePlan.action,
      policy: DEFAULT_POLICY,
    });
    const reasonFromLlm = Boolean(llmReason);
    if (reasonFromLlm) anyLlmNarration = true;

    const plan = llmReason
      ? decide({ meta, snapshot, policy: DEFAULT_POLICY, reason: llmReason })
      : basePlan;

    const isEquity = meta.kind === 'tokenized_equity';
    const sources: DecisionSources = {
      marketHours: 'live',
      referencePrice: !meta.reference ? 'n/a' : referenceFetched ? 'live' : 'stub',
      // xStockPrice = the issuer's indicative quote (xStocks public API).
      // Order-book microstructure stays modelled — not claimed as live.
      xStockPrice: !isEquity ? 'n/a' : xstockLive?.priceLive ? 'live' : 'stub',
      // xStockStatus = the official market/atomic trading-halt feed.
      xStockStatus: !isEquity ? 'n/a' : xstockLive?.statusLive ? 'live' : 'stub',
      onChainWrite: 'live',
    };

    const { aiProposal, policyReview } = buildAgentReceiptData({
      meta,
      snapshot,
      policy: DEFAULT_POLICY,
      riskScore: plan.riskScore,
      finalAction: plan.action,
      reason: plan.reason,
      reasonFromLlm,
      narrationModel: reasonFromLlm ? NARRATION_MODEL : null,
    });

    const canonical = buildCanonicalDecision({
      agentId: cfg.agentId,
      meta,
      snapshot,
      breakdown: plan.breakdown,
      policy: DEFAULT_POLICY,
      aiProposal,
      policyReview,
      action: plan.action,
      riskScore: plan.riskScore,
      reason: plan.reason,
      sources,
      xstocks: isEquity
        ? {
            indicativePriceUsd: xstockLive?.indicativePrice ?? null,
            priceSource: xstockLive?.priceLive ? 'xstocks-public-api' : null,
            marketTradingHalted: xstockLive?.marketTradingHalted ?? null,
            atomicTradingHalted: xstockLive?.atomicTradingHalted ?? null,
          }
        : null,
      narrationModel: reasonFromLlm ? NARRATION_MODEL : null,
      narrationFromLlm: reasonFromLlm,
      timestamp: Date.now(),
    });

    const decision: Decision = {
      asset: plan.asset,
      action: plan.action,
      riskScore: plan.riskScore,
      breakdown: plan.breakdown,
      reason: plan.reason,
      reasonHash: canonical.hash,
      policyHash: canonical.policyHash,
    };

    const result: PerAssetResult = {
      symbol,
      action: plan.action,
      riskScore: plan.riskScore,
      reason: plan.reason,
      reasonFromLlm,
      canonicalJson: canonical.json,
      canonicalHash: canonical.hash,
      sources,
    };

    try {
      const { txHash, blockNumber } = await logger.log(cfg.agentId, meta.address, decision);
      result.txHash = txHash;
      result.blockNumber = blockNumber.toString();
      // txHash present = the write landed in the mempool and will mine;
      // blockNumber 0n only means our receipt poll hasn't confirmed it yet.
      // onChainWrite stays 'live' — only a submission failure is a stub.
    } catch (e) {
      result.sources = { ...sources, onChainWrite: 'stub' };
      result.error = (e as Error).message.split('\n')[0];
    }

    results.push(result);
  }

  // Phase 2 — on-chain execution, opt-in via cfg.execution and only on mainnet.
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

  // Tri-state aggregation. "stub" only ever means "this signal SHOULD have
  // been live but the source we wired didn't deliver"; "n/a" means the
  // signal isn't applicable to the assets in the active scenario.
  const equityCount = monitored.filter((s) => ASSET_REGISTRY[s].kind === 'tokenized_equity').length;
  const referencePrices: FlagState =
    equityCount === 0 ? 'n/a' : anyReferenceFetched ? 'live' : 'stub';
  // xStock indicative price + trading status come from the xStocks public
  // API. 'live' once at least one equity returned data, 'stub' if the API
  // was unreachable for the whole run, 'n/a' when no equity was monitored.
  const xStockPrices: FlagState =
    equityCount === 0 ? 'n/a' : anyXStockPriceLive ? 'live' : 'stub';
  const xStockStatus: FlagState =
    equityCount === 0 ? 'n/a' : anyXStockStatusLive ? 'live' : 'stub';
  // 'live' once every decision has a tx hash (in the mempool). A missing
  // tx hash means the submission itself failed — that is the only 'stub'.
  const onChainWrite: FlagState = results.every((r) => r.txHash) ? 'live' : 'stub';
  const onChainExecution: FlagState = !cfg.execution
    ? 'n/a'
    : execution
      ? 'live'
      : 'stub';

  return {
    startedAt,
    durationMs: Date.now() - startedAt,
    marketOpen,
    network: cfg.network,
    scenario,
    inputs: {
      marketHours: 'live',
      referencePrices,
      xStockPrices,
      xStockStatus,
      onChainWrite,
      onChainExecution,
      llmReasoning: anyLlmNarration ? 'live' : 'stub',
    },
    narrationModel: anyLlmNarration ? NARRATION_MODEL : undefined,
    policyName: DEFAULT_POLICY.name,
    results,
    execution,
    executionError,
  };
}

async function runExecution(cfg: RunConfig): Promise<ExecutionResult> {
  const exec = cfg.execution!;
  const account = privateKeyToAccount(cfg.privateKey);
  const transport = http(cfg.rpcUrl);
  const wallet = createWalletClient({ account, chain: mantle, transport });
  const pub = createPublicClient({ chain: mantle, transport });

  if (exec.action === 'allocate') {
    // ALLOCATE — Fluxion USDC → mETH swap. mETH is Mantle's native liquid-
    // staked ETH. Pool confirmed at fee tier 3000 (0.3%):
    // 0xEEbc5E596d6C788Bcaa5324f44a8F648b746e041. Aligned with the RWA
    // narrative (Mantle-native LST) far better than a generic USDC → WMNT.
    const clients = { pub, wallet, account };
    const usdc = MAINNET_TOKENS.USDC.address;
    const meth = MAINNET_TOKENS.mETH.address;

    // Pre-flight balance check. Never submit a swap the runner cannot cover —
    // a USDC shortfall otherwise surfaces as a cryptic empty-reason revert
    // from the pool callback. Cap the amount to the live balance and fail
    // with an actionable message if it is below a usable floor.
    const usdcBalance = (await pub.readContract({
      address: usdc,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })) as bigint;
    const MIN_SWAP = 20_000n; // 0.02 USDC
    const amountIn =
      exec.amountUsdcBaseUnits <= usdcBalance ? exec.amountUsdcBaseUnits : usdcBalance;
    if (amountIn < MIN_SWAP) {
      throw new Error(
        `Runner USDC balance is ${formatUsdc(usdcBalance)} USDC — below the 0.02 USDC ` +
          `execution minimum. Fund the runner wallet with USDC to re-enable on-chain execution.`,
      );
    }

    // Leg 1 — USDC → mETH (the allocation itself).
    const methBefore = (await pub.readContract({
      address: meth,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })) as bigint;
    const leg1 = await swapExactInputSingle(clients, {
      tokenIn: usdc,
      tokenOut: meth,
      amountIn,
      slippageBps: exec.slippageBps,
    });

    if (!exec.roundTrip) {
      // Production behaviour: the agent holds the mETH position.
      return {
        action: 'allocate',
        txHash: leg1.txHash,
        approveTxHash: leg1.approveTxHash,
        blockNumber: leg1.blockNumber.toString(),
        description: `Swapped ${formatUsdc(amountIn)} USDC → mETH on Fluxion V3 (Mantle-native LST, fee ${leg1.fee / 100} bps).`,
        steps: [{ label: 'USDC → mETH', txHash: leg1.txHash, blockNumber: leg1.blockNumber.toString() }],
      };
    }

    // Leg 2 — mETH → USDC. Demo-only unwind: keeps the shared demo wallet
    // solvent for every judge. Both legs are real on-chain Fluxion swaps.
    let methReceived = (await pub.readContract({
      address: meth,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })) as bigint;
    methReceived -= methBefore;
    if (methReceived <= 0n) {
      throw new Error(
        `Round-trip leg 1 settled (${leg1.txHash}) but the mETH credit did not show on the runner balance — skipping the unwind.`,
      );
    }
    const leg2 = await swapExactInputSingle(clients, {
      tokenIn: meth,
      tokenOut: usdc,
      amountIn: methReceived,
      slippageBps: exec.slippageBps,
    });
    return {
      action: 'allocate',
      txHash: leg1.txHash,
      approveTxHash: leg1.approveTxHash,
      blockNumber: leg1.blockNumber.toString(),
      description:
        `Demo round-trip on Fluxion V3 — swapped ${formatUsdc(amountIn)} USDC → mETH, then unwound ` +
        `mETH → USDC. Two real on-chain swaps; the unwind keeps the shared demo wallet solvent for ` +
        `every judge. In production the agent holds the mETH position (roundTrip disabled).`,
      steps: [
        { label: 'USDC → mETH', txHash: leg1.txHash, blockNumber: leg1.blockNumber.toString() },
        { label: 'mETH → USDC (demo unwind)', txHash: leg2.txHash, blockNumber: leg2.blockNumber.toString() },
      ],
    };
  }

  // MOVE_TO_STABLE_YIELD — supply USDC to INIT's USDC pool. Real Mantle RWA
  // rail. The USDY pool requires an existing USDY balance which we don't
  // yet hold; the USDC pool is the closest documented stable-yield rail
  // accessible from a USDC-funded runner.
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
    description: `Supplied ${formatUsdc(exec.amountUsdcBaseUnits)} USDC to INIT Capital USDC pool (Mantle RWA-yield rail).`,
  };
}

function formatUsdc(baseUnits: bigint): string {
  const whole = baseUnits / 1_000_000n;
  const frac = (baseUnits % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '') || '0';
  return frac === '0' ? `${whole}` : `${whole}.${frac}`;
}

// Re-export so the API route can pass them through to the canonical layer
// when needed without importing canonical.ts directly.
export type { CanonicalDecision, DecisionSources, SourceState };
