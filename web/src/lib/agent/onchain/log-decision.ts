// Mirrored from /agent/src/onchain/log-decision.ts.
import {
  type Address,
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet, mantle } from 'viem/chains';
import type { Decision } from '../types';
import { ACTION_TO_ENUM } from '../types';

const LOGGER_ABI = [
  {
    type: 'function',
    name: 'logDecision',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'asset', type: 'address' },
      { name: 'action', type: 'uint8' },
      { name: 'riskScore', type: 'uint16' },
      { name: 'reasonHash', type: 'bytes32' },
      { name: 'policyHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

export interface LoggedDecision {
  txHash: Hex;
  blockNumber: bigint;
}

function shortError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message?.split('\n')[0] ?? 'unknown error';
}

/**
 * Mantle's public RPC intermittently answers eth_getTransactionReceipt (and
 * other reads) with "Requested resource not found" while a tx is still
 * propagating. That is a transport hiccup, NOT a failed transaction — so we
 * retry rather than treat it as a permanent error.
 */
function isTransientRpcError(e: unknown): boolean {
  return /Requested resource not found|resource not found|could not be found|timed out|timeout|fetch failed|ECONNRESET|socket hang up|503|502|429/i.test(
    shortError(e),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a receipt, tolerating Mantle public-RPC hiccups. Returns the
 * mined block number, or 0n only if the tx is genuinely not included within
 * the window. A 0n here means "not yet confirmed", never "failed" — the tx
 * hash is already in the mempool and will mine.
 */
async function waitForReceiptRobust(
  pub: PublicClient,
  hash: Hex,
  timeoutMs: number,
): Promise<bigint> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const receipt = await pub.waitForTransactionReceipt({
        hash,
        timeout: Math.min(20_000, Math.max(2_000, deadline - Date.now())),
      });
      return receipt.blockNumber;
    } catch (e) {
      if (!isTransientRpcError(e)) break;
      await sleep(2_000);
    }
  }
  // One last direct lookup — the tx may have mined while our poll was failing.
  try {
    const receipt = await pub.getTransactionReceipt({ hash });
    return receipt.blockNumber;
  } catch {
    return 0n;
  }
}

export interface OnChainLogger {
  log(agentId: bigint, assetAddress: Address, decision: Decision): Promise<LoggedDecision>;
}

export interface LoggerConfig {
  network: 'mantle_sepolia' | 'mantle';
  rpcUrl: string;
  privateKey: Hex;
  loggerAddress: Address;
}

export function createOnChainLogger(cfg: LoggerConfig): OnChainLogger {
  const account = privateKeyToAccount(cfg.privateKey);
  const chain = cfg.network === 'mantle' ? mantle : mantleSepoliaTestnet;
  const transport = http(cfg.rpcUrl);
  const wallet: WalletClient = createWalletClient({ account, chain, transport });
  const pub: PublicClient = createPublicClient({ chain, transport });

  // Local nonce counter, lazily initialized. Mantle Sepolia's public RPC
  // lags between fast sequential writes, so refetching per-call races. Seed
  // once, increment in process. We reset on submission errors but NOT on
  // receipt-poll timeouts — once a tx is in the mempool the nonce is spent,
  // even if our receipt poll gives up before inclusion.
  let nonce: number | null = null;

  async function submit(args: readonly unknown[]): Promise<Hex> {
    if (nonce === null) {
      nonce = await pub.getTransactionCount({ address: account.address, blockTag: 'pending' });
    }
    let attempt = 0;
    while (true) {
      const thisNonce = nonce;
      nonce += 1;
      try {
        return await wallet.writeContract({
          address: cfg.loggerAddress,
          abi: LOGGER_ABI,
          functionName: 'logDecision',
          // viem-typed args
          args: args as Parameters<typeof wallet.writeContract>[0]['args'],
          account,
          chain,
          nonce: thisNonce,
        } as Parameters<typeof wallet.writeContract>[0]);
      } catch (e) {
        const msg = (e as Error).message ?? '';
        const isNonceTooLow = /nonce too low|Nonce provided/i.test(msg);
        if (isNonceTooLow && attempt < 3) {
          // Re-sync with the chain and retry.
          attempt += 1;
          nonce = await pub.getTransactionCount({
            address: account.address,
            blockTag: 'pending',
          });
          continue;
        }
        // Permanent submission failure: reset the counter so the next call
        // re-fetches a clean nonce, then propagate.
        nonce = null;
        throw e;
      }
    }
  }

  return {
    async log(agentId, assetAddress, decision) {
      const txHash = await submit([
        agentId,
        assetAddress,
        ACTION_TO_ENUM[decision.action],
        decision.riskScore,
        decision.reasonHash,
        decision.policyHash,
      ]);

      // Receipt wait tolerant of Mantle public-RPC hiccups. If it still times
      // out, the tx is in the mempool and the next call's nonce stays correct;
      // we surface blockNumber=0n (= "pending", not "failed") so the caller
      // can render it honestly.
      const blockNumber = await waitForReceiptRobust(pub, txHash, 45_000);
      return { txHash, blockNumber };
    },
  };
}
