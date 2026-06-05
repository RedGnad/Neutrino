/**
 * Canonical ERC-8004 (Trustless Agents) registry constants for Mantle.
 *
 * ERC-8004 deploys its three registries as per-chain singletons. The
 * addresses below are the canonical deployments curated by the 8004 team and
 * verifiable on Mantlescan:
 *   - Spec:   https://eips.ethereum.org/EIPS/eip-8004
 *   - Repo:   https://github.com/erc-8004/erc-8004-contracts (Contract Addresses)
 *
 * Neutrino registers its agent on the IdentityRegistry (an ERC-721 +
 * URIStorage contract) via `register(agentURI)`, and binds every on-chain
 * decision to the returned `agentId`. This is the SAME registry every other
 * Turing Test Hackathon agent uses, so judges can resolve our identity and
 * registration file from a single, standard source — not a bespoke NFT.
 */

import type { Address } from 'viem';

export interface Erc8004Registries {
  /** EVM chainId of the network. */
  chainId: number;
  /** CAIP-2-style namespace ("eip155" for EVM chains). */
  namespace: 'eip155';
  /** ERC-721 IdentityRegistry singleton. */
  identityRegistry: Address;
  /** ReputationRegistry singleton (giveFeedback / getSummary). */
  reputationRegistry: Address;
}

/** Mantle Mainnet (chainId 5000). */
export const ERC8004_MANTLE: Erc8004Registries = {
  chainId: 5000,
  namespace: 'eip155',
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
};

/** Mantle Testnet (Sepolia). */
export const ERC8004_MANTLE_SEPOLIA: Erc8004Registries = {
  chainId: 5003,
  namespace: 'eip155',
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
};

export type NeutrinoNetwork = 'mantle' | 'mantle_sepolia';

export function erc8004For(network: NeutrinoNetwork): Erc8004Registries {
  return network === 'mantle' ? ERC8004_MANTLE : ERC8004_MANTLE_SEPOLIA;
}

/**
 * Build the canonical ERC-8004 agent identifier string
 * `{namespace}:{chainId}:{identityRegistry}` used in registration / feedback
 * files to tie off-chain payloads back to the on-chain agent.
 */
export function agentRegistryId(network: NeutrinoNetwork): string {
  const r = erc8004For(network);
  return `${r.namespace}:${r.chainId}:${r.identityRegistry}`;
}

/**
 * ERC-8004 agent registration file (the JSON an `agentURI` resolves to).
 * Shape per the spec's `registration-v1`:
 *   https://eips.ethereum.org/EIPS/eip-8004#registration-v1
 */
export interface Erc8004RegistrationFile {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image: string;
  services: Array<{ name: string; endpoint: string; version?: string }>;
  x402Support: boolean;
  active: boolean;
  registrations: Array<{ agentId: number; agentRegistry: string }>;
  supportedTrust: string[];
}

export interface RegistrationFileParams {
  /** Absolute site origin, e.g. https://neutrino-fawn.vercel.app (no trailing slash). */
  siteUrl: string;
  network: NeutrinoNetwork;
  /** Canonical ERC-8004 agentId returned by IdentityRegistry.register(). */
  agentId: number;
}

/**
 * Build Neutrino's ERC-8004 registration file. Pure (no env access) so it can
 * be served by a route handler or embedded in a verification page.
 */
export function buildRegistrationFile(params: RegistrationFileParams): Erc8004RegistrationFile {
  const site = params.siteUrl.replace(/\/+$/, '');
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Neutrino',
    description:
      'Autonomous RWA risk-management agent on Mantle. Monitors tokenized equities ' +
      '(xStocks) and on-chain yield assets (USDY, mETH), scores each with a deterministic, ' +
      'auditable risk engine, and commits every decision on-chain via an event-only logger ' +
      'whose reasonHash pins the full canonical decision JSON. The LLM narrates; it never ' +
      'changes the action.',
    image: `${site}/logo.svg`,
    services: [
      { name: 'web', endpoint: `${site}/` },
      { name: 'proof', endpoint: `${site}/proof` },
    ],
    x402Support: false,
    active: true,
    registrations: [
      { agentId: params.agentId, agentRegistry: agentRegistryId(params.network) },
    ],
    supportedTrust: ['reputation'],
  };
}

/**
 * Minimal ABI slice of the canonical IdentityRegistry we read/write.
 * Source: erc-8004/erc-8004-contracts/contracts/IdentityRegistryUpgradeable.sol
 */
export const IDENTITY_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setAgentURI',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;
