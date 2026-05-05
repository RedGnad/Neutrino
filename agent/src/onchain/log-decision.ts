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
import type { Decision } from '../types.ts';
import { ACTION_TO_ENUM } from '../types.ts';

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

  return {
    async log(agentId, assetAddress, decision) {
      // Explicit nonce per-call. Mantle Sepolia public RPC sometimes lags,
      // so we use the pending count to stay ahead of in-flight txs.
      const nonce = await pub.getTransactionCount({
        address: account.address,
        blockTag: 'pending',
      });

      const txHash = await wallet.writeContract({
        address: cfg.loggerAddress,
        abi: LOGGER_ABI,
        functionName: 'logDecision',
        args: [
          agentId,
          assetAddress,
          ACTION_TO_ENUM[decision.action],
          decision.riskScore,
          decision.reasonHash,
          decision.policyHash,
        ],
        account,
        chain,
        nonce,
      });

      // Wait for inclusion so the next call sees the updated nonce.
      const receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      return { txHash, blockNumber: receipt.blockNumber };
    },
  };
}
