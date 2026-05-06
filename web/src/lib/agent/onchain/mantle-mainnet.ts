/**
 * Mantle mainnet on-chain constants.
 *
 * Sourced from:
 *   - Fluxion V3: https://github.com/Fluxion-Exchange/Fluxion-trade-skill (references/contracts.md)
 *   - INIT Capital: https://dev.init.capital/contract-addresses/mantle
 *   - Ondo USDY: https://docs.ondo.finance/addresses
 *   - Mantle native: https://docs.mantle.xyz
 *
 * All addresses are checksummed. chainId 5000.
 */

import type { Address } from 'viem';

export const MANTLE_MAINNET = {
  chainId: 5000,
  name: 'Mantle',
  rpcUrl: 'https://rpc.mantle.xyz',
  explorerTx: 'https://mantlescan.xyz/tx',
  explorerAddress: 'https://mantlescan.xyz/address',
  explorerBlock: 'https://mantlescan.xyz/block',
  nativeSymbol: 'MNT',
} as const;

/** Fluxion V3 (Uniswap V3 fork) — primary swap venue. */
export const FLUXION = {
  swapRouter: '0x5628a59dF0ECAC3f3171f877A94bEb26BA6DFAa0' as Address,
  factory: '0xF883162Ed9c7E8EF604214c964c678E40c9B737C' as Address,
  quoterV2: '0x3E4eE18Ac7280813236a1EB850679Da5322E14CE' as Address,
  /** REST quote endpoint, used as a sanity-check before signing. */
  quoteApiExactIn: 'https://skillapi.fluxion.network/quote/exact-in',
  /** Common Uniswap V3 fee tiers (0.05%, 0.3%, 1%). */
  feeTiers: [500, 3000, 10000] as const,
} as const;

/** INIT Capital — money-market for stable-yield parking (USDY pool = real Ondo T-bill yield). */
export const INIT_CAPITAL = {
  initCore: '0x972BcB0284cca0152527c4f70f8F689852bCAFc5' as Address,
  posManager: '0x0e7401707CD08c03CDb53DAEF3295DDFb68BBa92' as Address,
  pools: {
    USDY: '0xf084813F1be067d980a0171F067f084f27B3F63A' as Address,
    USDe: '0x3282437C436eE6AA9861a6A46ab0822d82581b1c' as Address,
    METH: '0x5071c003bB45e49110a905c1915EbdD2383A89dF' as Address,
    USDC: '0x00A55649E597d463fD212fBE48a3B40f0E227d06' as Address,
    USDT: '0xadA66a8722B5cdfe3bC504007A5d793e7100ad09' as Address,
    WETH: '0x51AB74f8B03F0305d8dcE936B473AB587911AEC4' as Address,
    WMNT: '0x44949636f778fAD2b139E665aee11a2dc84A2976' as Address,
    WBTC: '0x9c9F28672C4A8Ad5fb2c9Aca6d8D68B02EAfd552' as Address,
  },
} as const;

/** Mantle mainnet ERC-20 tokens we touch. */
export const MAINNET_TOKENS = {
  WMNT: { address: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8' as Address, decimals: 18, symbol: 'WMNT' },
  USDC: { address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9' as Address, decimals: 6, symbol: 'USDC' },
  USDT0: { address: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736' as Address, decimals: 6, symbol: 'USDT0' },
  USDY: { address: '0x5bE26527e817998A7206475496fDE1E68957c5A6' as Address, decimals: 18, symbol: 'USDY' },
  /** mUSD is rebasing — balances change without explicit transfers. */
  mUSD: { address: '0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3' as Address, decimals: 18, symbol: 'mUSD' },
} as const;

export type MainnetTokenSymbol = keyof typeof MAINNET_TOKENS;

/**
 * Minimal ERC-20 ABI for approve/balance/decimals reads we need.
 */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;
