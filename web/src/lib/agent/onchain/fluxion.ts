/**
 * Fluxion V3 SwapRouter wrapper. Uniswap V3 ABI; addresses sourced from the
 * official Fluxion-Exchange/Fluxion-trade-skill repo.
 *
 * Usage flow:
 *   1) `findPoolFee(tokenIn, tokenOut)` — discover the active fee tier (500 / 3000 / 10000).
 *   2) `quoteExactInputSingle(...)` — read-only price quote via QuoterV2.
 *   3) `swapExactInputSingle(...)` — approve + swap, returns { txHash, amountOut, blockNumber }.
 *
 * Slippage default = 50 bps. Caller can override.
 */

import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  maxUint256,
  parseAbiItem,
} from 'viem';
import type { Account } from 'viem/accounts';
import { ERC20_ABI, FLUXION, MANTLE_MAINNET } from './mantle-mainnet';

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getPool',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'nonpayable', // QuoterV2 uses staticcall pattern, but ABI is nonpayable
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

function shortError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message?.split('\n')[0] ?? 'unknown error';
}

function isRetryableRpcError(e: unknown): boolean {
  return /Requested resource not found|resource not found|nonce too low|replacement transaction underpriced|already known|timed out|timeout/i.test(
    shortError(e),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a read/RPC call through Mantle public-RPC hiccups ("Requested
 * resource not found", timeouts). Only transient transport errors are
 * retried — a genuine revert propagates immediately.
 */
async function withRpcRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= maxAttempts || !isRetryableRpcError(e)) {
        throw new Error(`${label}: ${shortError(e)}`);
      }
      await sleep(1_500 * attempt);
    }
  }
}

async function waitForReceipt(
  pub: PublicClient,
  hash: Hex,
  timeoutMs: number,
): Promise<{ blockNumber: bigint }> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await pub.waitForTransactionReceipt({
        hash,
        timeout: Math.min(15_000, Math.max(1_000, deadline - Date.now())),
      });
    } catch (e) {
      if (Date.now() >= deadline || !isRetryableRpcError(e)) {
        // The tx may have mined while our poll was failing — check directly
        // before surfacing an error.
        try {
          return await pub.getTransactionReceipt({ hash });
        } catch {
          throw e;
        }
      }
      await sleep(1_500);
    }
  }
}

export interface FluxionClients {
  pub: PublicClient;
  wallet: WalletClient;
  account: Account;
}

/** Try each fee tier until factory returns a non-zero pool address. */
export async function findPoolFee(
  pub: PublicClient,
  tokenA: Address,
  tokenB: Address,
): Promise<number | null> {
  for (const fee of FLUXION.feeTiers) {
    const pool = await withRpcRetry(`Fluxion pool discovery (fee ${fee})`, () =>
      pub.readContract({
        address: FLUXION.factory,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenA, tokenB, fee],
      }),
    );
    if ((pool as Address) !== ZERO_ADDRESS) return fee;
  }
  return null;
}

/** Read-only price quote. Returns the raw amountOut from QuoterV2. */
export async function quoteExactInputSingle(
  pub: PublicClient,
  params: { tokenIn: Address; tokenOut: Address; amountIn: bigint; fee: number },
): Promise<bigint> {
  const { result } = await withRpcRetry('Fluxion quote', () =>
    pub.simulateContract({
      address: FLUXION.quoterV2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          fee: params.fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }),
  );
  return result[0];
}

export interface SwapResult {
  txHash: Hex;
  approveTxHash?: Hex;
  amountIn: bigint;
  amountOutQuoted: bigint;
  amountOutMinimum: bigint;
  fee: number;
  blockNumber: bigint;
}

export interface SwapInput {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  /** Slippage tolerance in basis points. Default 50 bps. */
  slippageBps?: number;
  /** Recipient of the output token. Defaults to the signer. */
  recipient?: Address;
  /** How long the tx is valid (seconds from now). Default 1200 (20 min). */
  deadlineSeconds?: number;
}

/**
 * Approve + swap. Sequential: approval is awaited (receipt) before the swap is sent
 * so the swap-router has the allowance it needs at the moment of execution.
 *
 * Skips the approve step if the existing allowance already covers `amountIn`.
 */
export async function swapExactInputSingle(
  clients: FluxionClients,
  input: SwapInput,
): Promise<SwapResult> {
  const { pub, wallet, account } = clients;
  const signer = account.address;
  const recipient = input.recipient ?? signer;
  const slippageBps = input.slippageBps ?? 50;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (input.deadlineSeconds ?? 1200));

  // 1. Discover fee tier.
  const fee = await findPoolFee(pub, input.tokenIn, input.tokenOut);
  if (fee === null) {
    throw new Error(`No Fluxion V3 pool found for ${input.tokenIn} / ${input.tokenOut}`);
  }

  // 2. Quote and compute amountOutMinimum with slippage.
  const amountOutQuoted = await quoteExactInputSingle(pub, {
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    amountIn: input.amountIn,
    fee,
  });
  const amountOutMinimum = (amountOutQuoted * BigInt(10_000 - slippageBps)) / 10_000n;

  // 3. Approve if necessary.
  let approveTxHash: Hex | undefined;
  const allowance = (await withRpcRetry('Fluxion allowance check', () =>
    pub.readContract({
      address: input.tokenIn,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [signer, FLUXION.swapRouter],
    }),
  )) as bigint;

  if (allowance < input.amountIn) {
    try {
      const approveNonce = await withRpcRetry('Fluxion nonce fetch (approve)', () =>
        pub.getTransactionCount({ address: signer, blockTag: 'pending' }),
      );
      // Approve max so this is a one-time cost: subsequent runs find a
      // sufficient allowance and skip the approve tx entirely. Fewer on-chain
      // round-trips per run keeps the serverless execution inside its budget.
      approveTxHash = await wallet.writeContract({
        address: input.tokenIn,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FLUXION.swapRouter, maxUint256],
        account,
        chain: { id: MANTLE_MAINNET.chainId, name: MANTLE_MAINNET.name, nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: [MANTLE_MAINNET.rpcUrl] } } },
        nonce: approveNonce,
      });
    } catch (e) {
      throw new Error(`Fluxion approve submit failed: ${shortError(e)}`);
    }
    try {
      await waitForReceipt(pub, approveTxHash, 45_000);
    } catch (e) {
      throw new Error(`Fluxion approve receipt wait failed for ${approveTxHash}: ${shortError(e)}`);
    }
  }

  // 4. Swap.
  let txHash: Hex;
  try {
    const swapNonce = await withRpcRetry('Fluxion nonce fetch (swap)', () =>
      pub.getTransactionCount({ address: signer, blockTag: 'pending' }),
    );
    txHash = await wallet.writeContract({
      address: FLUXION.swapRouter,
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          fee,
          recipient,
          deadline,
          amountIn: input.amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ],
      account,
      chain: { id: MANTLE_MAINNET.chainId, name: MANTLE_MAINNET.name, nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: [MANTLE_MAINNET.rpcUrl] } } },
      nonce: swapNonce,
    });
  } catch (e) {
    throw new Error(`Fluxion swap submit failed: ${shortError(e)}`);
  }
  let receipt: { blockNumber: bigint };
  try {
    receipt = await waitForReceipt(pub, txHash, 45_000);
  } catch (e) {
    throw new Error(`Fluxion swap receipt wait failed for ${txHash}: ${shortError(e)}`);
  }

  return {
    txHash,
    approveTxHash,
    amountIn: input.amountIn,
    amountOutQuoted,
    amountOutMinimum,
    fee,
    blockNumber: receipt.blockNumber,
  };
}

// Re-export viem helpers callers commonly want for symmetry. Not strictly needed.
export { encodeFunctionData, parseAbiItem };
