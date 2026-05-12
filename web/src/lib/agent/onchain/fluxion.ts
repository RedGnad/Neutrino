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
  parseAbiItem,
} from 'viem';
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

export interface FluxionClients {
  pub: PublicClient;
  wallet: WalletClient;
  signer: Address;
}

/** Try each fee tier until factory returns a non-zero pool address. */
export async function findPoolFee(
  pub: PublicClient,
  tokenA: Address,
  tokenB: Address,
): Promise<number | null> {
  for (const fee of FLUXION.feeTiers) {
    let pool: Address;
    try {
      pool = (await pub.readContract({
        address: FLUXION.factory,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenA, tokenB, fee],
      })) as Address;
    } catch (e) {
      throw new Error(`Fluxion pool discovery failed at fee ${fee}: ${shortError(e)}`);
    }
    if (pool !== ZERO_ADDRESS) return fee;
  }
  return null;
}

/** Read-only price quote. Returns the raw amountOut from QuoterV2. */
export async function quoteExactInputSingle(
  pub: PublicClient,
  params: { tokenIn: Address; tokenOut: Address; amountIn: bigint; fee: number },
): Promise<bigint> {
  try {
    const { result } = await pub.simulateContract({
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
    });
    return result[0];
  } catch (e) {
    throw new Error(`Fluxion quote failed: ${shortError(e)}`);
  }
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
  const { pub, wallet, signer } = clients;
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
  let allowance: bigint;
  try {
    allowance = (await pub.readContract({
      address: input.tokenIn,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [signer, FLUXION.swapRouter],
    })) as bigint;
  } catch (e) {
    throw new Error(`Fluxion allowance check failed: ${shortError(e)}`);
  }

  if (allowance < input.amountIn) {
    try {
      approveTxHash = await wallet.writeContract({
        address: input.tokenIn,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FLUXION.swapRouter, input.amountIn],
        account: signer,
        chain: { id: MANTLE_MAINNET.chainId, name: MANTLE_MAINNET.name, nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: [MANTLE_MAINNET.rpcUrl] } } },
      });
      await pub.waitForTransactionReceipt({ hash: approveTxHash, timeout: 90_000 });
    } catch (e) {
      throw new Error(`Fluxion approve failed: ${shortError(e)}`);
    }
  }

  // 4. Swap.
  let txHash: Hex;
  try {
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
      account: signer,
      chain: { id: MANTLE_MAINNET.chainId, name: MANTLE_MAINNET.name, nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: [MANTLE_MAINNET.rpcUrl] } } },
    });
  } catch (e) {
    throw new Error(`Fluxion swap failed: ${shortError(e)}`);
  }
  let receipt: { blockNumber: bigint };
  try {
    receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
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
