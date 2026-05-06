/**
 * INIT Capital supply wrapper. Used by the agent's MOVE_TO_STABLE_YIELD action
 * to park stable assets in INIT's USDY pool (real Ondo T-bill yield exposure).
 *
 * IMPORTANT — ABI verification needed before first mainnet call:
 *   The exact `mintTo` signature must be confirmed against the on-chain bytecode at
 *   InitCore (`0x972BcB0284cca0152527c4f70f8F689852bCAFc5`) via Mantlescan's
 *   verified contract page or dev.init.capital. The shape below assumes:
 *
 *     mintTo(address pool, address to) → uint256 shares
 *
 *   with the caller having either (a) transferred the underlying token to InitCore
 *   immediately before, or (b) granted an allowance that InitCore pulls from.
 *
 *   If the actual signature is `mintTo(address pool, uint256 amount, address to)`,
 *   the caller passes the amount explicitly. Both flows are kept here behind the
 *   `mode` option so we can flip without rewriting the call site.
 *
 * Source: https://dev.init.capital/contract-addresses/mantle
 */

import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { ERC20_ABI, INIT_CAPITAL, MANTLE_MAINNET } from './mantle-mainnet';

const INIT_CORE_ABI_NO_AMOUNT = [
  {
    type: 'function',
    name: 'mintTo',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pool', type: 'address' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
] as const;

const INIT_CORE_ABI_WITH_AMOUNT = [
  {
    type: 'function',
    name: 'mintTo',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pool', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
] as const;

const MANTLE_CHAIN = {
  id: MANTLE_MAINNET.chainId,
  name: MANTLE_MAINNET.name,
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: [MANTLE_MAINNET.rpcUrl] } },
} as const;

export type InitSupplyMode =
  /** approve(InitCore, amount) → InitCore.mintTo(pool, to) — InitCore pulls via transferFrom. */
  | 'approve-then-mint-no-amount'
  /** approve(InitCore, amount) → InitCore.mintTo(pool, amount, to). */
  | 'approve-then-mint-with-amount'
  /** transfer(InitCore, amount) → InitCore.mintTo(pool, to) — InitCore reads its own balance. */
  | 'transfer-then-mint-no-amount';

export interface InitClients {
  pub: PublicClient;
  wallet: WalletClient;
  signer: Address;
}

export interface SupplyInput {
  /** ERC-20 token being supplied (e.g. USDY, USDC). */
  token: Address;
  /** INIT pool address (e.g. INIT_CAPITAL.pools.USDY). */
  pool: Address;
  /** Amount in token base units (decimals as per the token). */
  amount: bigint;
  /** Recipient of the pool shares. Defaults to signer. */
  recipient?: Address;
  /** Pattern to use; default `approve-then-mint-no-amount`. Switch if smoke-test reverts. */
  mode?: InitSupplyMode;
}

export interface SupplyResult {
  txHash: Hex;
  approveOrTransferTxHash: Hex;
  pool: Address;
  amount: bigint;
  blockNumber: bigint;
}

export async function supplyToInit(
  clients: InitClients,
  input: SupplyInput,
): Promise<SupplyResult> {
  const { pub, wallet, signer } = clients;
  const recipient = input.recipient ?? signer;
  const mode = input.mode ?? 'approve-then-mint-no-amount';

  // Step 1 — fund InitCore (either via approve or direct transfer).
  let approveOrTransferTxHash: Hex;
  if (mode === 'transfer-then-mint-no-amount') {
    approveOrTransferTxHash = await wallet.writeContract({
      address: input.token,
      abi: [
        {
          type: 'function',
          name: 'transfer',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ] as const,
      functionName: 'transfer',
      args: [INIT_CAPITAL.initCore, input.amount],
      account: signer,
      chain: MANTLE_CHAIN,
    });
  } else {
    const allowance = (await pub.readContract({
      address: input.token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [signer, INIT_CAPITAL.initCore],
    })) as bigint;
    if (allowance < input.amount) {
      approveOrTransferTxHash = await wallet.writeContract({
        address: input.token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [INIT_CAPITAL.initCore, input.amount],
        account: signer,
        chain: MANTLE_CHAIN,
      });
    } else {
      // Already approved; emit a no-op marker. Caller treats undefined-vs-set as
      // "did we have to spend an extra tx?" so we send a 0-value self-tx instead
      // of confusing the caller. Simpler: just use a sentinel.
      approveOrTransferTxHash = '0x' as Hex;
    }
  }
  if (approveOrTransferTxHash !== ('0x' as Hex)) {
    await pub.waitForTransactionReceipt({ hash: approveOrTransferTxHash, timeout: 90_000 });
  }

  // Step 2 — call InitCore.mintTo with the matching ABI shape.
  let txHash: Hex;
  if (mode === 'approve-then-mint-with-amount') {
    txHash = await wallet.writeContract({
      address: INIT_CAPITAL.initCore,
      abi: INIT_CORE_ABI_WITH_AMOUNT,
      functionName: 'mintTo',
      args: [input.pool, input.amount, recipient],
      account: signer,
      chain: MANTLE_CHAIN,
    });
  } else {
    txHash = await wallet.writeContract({
      address: INIT_CAPITAL.initCore,
      abi: INIT_CORE_ABI_NO_AMOUNT,
      functionName: 'mintTo',
      args: [input.pool, recipient],
      account: signer,
      chain: MANTLE_CHAIN,
    });
  }

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });

  return {
    txHash,
    approveOrTransferTxHash,
    pool: input.pool,
    amount: input.amount,
    blockNumber: receipt.blockNumber,
  };
}
