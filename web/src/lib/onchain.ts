import { createPublicClient, http, type Address, type Hex, parseAbiItem } from 'viem';
import { mantle, mantleSepoliaTestnet } from 'viem/chains';

/**
 * Network selection for live reads. Defaults to mainnet because the deployed
 * contracts (RWADecisionLogger, RWAAgent) are on Mantle mainnet.
 * Override with NEUTRINO_NETWORK=mantle_sepolia for local testnet development.
 */
const NEUTRINO_NETWORK = (process.env.NEUTRINO_NETWORK ?? 'mantle') as
  | 'mantle'
  | 'mantle_sepolia';

const RPC_URL =
  process.env.MANTLE_RPC ??
  (NEUTRINO_NETWORK === 'mantle'
    ? process.env.MANTLE_MAINNET_RPC ?? 'https://rpc.mantle.xyz'
    : process.env.MANTLE_SEPOLIA_RPC ?? 'https://rpc.sepolia.mantle.xyz');

const CHAIN = NEUTRINO_NETWORK === 'mantle' ? mantle : mantleSepoliaTestnet;

// Deployed on Mantle mainnet — hardcoded fallbacks so the public site works
// even if Vercel env vars are not set. These are NEXT_PUBLIC_* (non-secret).
const LOGGER_FALLBACK = '0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2';
const AGENT_FALLBACK  = '0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96';

export const LOGGER_ADDRESS = (
  process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS || LOGGER_FALLBACK
) as Address;

export const AGENT_ADDRESS = (
  process.env.NEXT_PUBLIC_RWA_AGENT_ADDRESS || AGENT_FALLBACK
) as Address;

export const EXPLORER_TX =
  NEUTRINO_NETWORK === 'mantle' ? 'https://mantlescan.xyz/tx' : 'https://sepolia.mantlescan.xyz/tx';
export const EXPLORER_ADDR =
  NEUTRINO_NETWORK === 'mantle'
    ? 'https://mantlescan.xyz/address'
    : 'https://sepolia.mantlescan.xyz/address';
export const EXPLORER_BLOCK =
  NEUTRINO_NETWORK === 'mantle'
    ? 'https://mantlescan.xyz/block'
    : 'https://sepolia.mantlescan.xyz/block';
export const NETWORK_LABEL = NEUTRINO_NETWORK === 'mantle' ? 'Mantle Mainnet' : 'Mantle Sepolia';

export const ACTION_LABELS = [
  'ALLOCATE',
  'HOLD',
  'REDUCE',
  'PAUSE',
  'MOVE_TO_STABLE_YIELD',
  'REQUIRE_HUMAN_CONFIRMATION',
] as const;

export type ActionLabel = (typeof ACTION_LABELS)[number];

/**
 * Asset address → display symbol map. Phase 2 mainnet:
 *   - Stable / yield assets (USDY, USDC, USDT0, mUSD) use real Mantle mainnet
 *     ERC-20 addresses, so /agent-decision and /market-map link to real
 *     Mantlescan token pages.
 *   - Tokenized equities (NVDAx, TSLAx, SPYx, etc.) keep placeholder addresses
 *     because individual xStock contract addresses on Mantle are not publicly
 *     indexed (Backed product DB and Fluxion skill repo both omit them).
 *     Replace once an address is recovered from Fluxion app or the Mantle team.
 *
 * All keys lower-cased so the resolver does case-insensitive lookup.
 */
const ASSET_BY_ADDRESS: Record<string, { symbol: string; reference?: string }> = {
  // --- xStocks: real Mantle mainnet ERC-20 addresses (xStocks public API,
  //     deployments[network=Mantle], verified on-chain 2026-05-21) ---
  '0xc845b2894dbddd03858fd2d643b4ef725fe0849d': { symbol: 'NVDAx', reference: 'NVDA' },
  '0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0': { symbol: 'TSLAx', reference: 'TSLA' },
  '0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48': { symbol: 'SPYx',  reference: 'SPY'  },
  '0x68fa48b1c2fe52b3d776e1953e0e782b5044ce28': { symbol: 'SPCXx', reference: 'SPCX' },
  // --- Legacy placeholder addresses kept so pre-2026-05-21 demo receipts
  //     (logged before the real xStock addresses were wired) still resolve ---
  '0x0000000000000000000000000000000000000001': { symbol: 'NVDAx', reference: 'NVDA' },
  '0x0000000000000000000000000000000000000002': { symbol: 'TSLAx', reference: 'TSLA' },
  '0x0000000000000000000000000000000000000003': { symbol: 'SPYx', reference: 'SPY' },
  '0x0000000000000000000000000000000000000005': { symbol: 'mETH' },
  // --- Real Mantle mainnet token addresses ---
  '0x5be26527e817998a7206475496fde1e68957c5a6': { symbol: 'USDY' }, // Ondo USDY
  '0xab575258d37eaa5c8956efabe71f4ee8f6397cf3': { symbol: 'mUSD' }, // Mantle native rebasing stable
  '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9': { symbol: 'USDC' },
  '0x779ded0c9e1022225f8e0630b35a9b54be713736': { symbol: 'USDT0' },
  '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8': { symbol: 'WMNT' },
  '0xcda86a272531e8640cd7f1a92c01839911b90bb0': { symbol: 'mETH' },
};

export function resolveAsset(address: Address): { symbol: string; reference?: string } {
  return (
    ASSET_BY_ADDRESS[address.toLowerCase()] ??
    ASSET_BY_ADDRESS[address] ?? {
      symbol: `${address.slice(0, 6)}…${address.slice(-4)}`,
    }
  );
}

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

const DECISION_LOGGED_EVENT = parseAbiItem(
  'event DecisionLogged(uint256 indexed agentId, address indexed asset, uint8 action, uint16 riskScore, bytes32 reasonHash, bytes32 policyHash, uint64 timestamp, address indexed caller)',
);

export interface OnChainDecision {
  txHash: Hex;
  blockNumber: bigint;
  agentId: bigint;
  assetAddress: Address;
  action: ActionLabel;
  actionIndex: number;
  riskScore: number;
  reasonHash: Hex;
  policyHash: Hex;
  timestamp: number; // ms
  caller: Address;
}

// First 5 decisions confirmed at blocks 94_987_254–94_987_269 via direct RPC test.
// Window anchored with safe margin; range = 9k (under the 10k RPC hard limit).
const INITIAL_WINDOW_FROM = 94_980_000n;
const INITIAL_WINDOW_TO   = 94_989_000n;

// Mantle public RPC enforces a strict 10,000-block max for eth_getLogs.
// 9k per window stays safely below the ceiling. 8 windows × 9k = 72k blocks
// ≈ 40 hours — wide enough to show runs from yesterday without manual refresh.
const WINDOW_SIZE = 9_000n;
const NUM_WINDOWS = 8;

/**
 * Pull the most recent N DecisionLogged events from RWADecisionLogger.
 *
 * Multi-window strategy:
 *  - 8 sliding windows of 9k blocks each, newest first → covers ~40 hours.
 *    Runs within that window always appear; no stale fallback dominates.
 *  - Hardcoded initial window (blocks 94_980_000–94_989_000) for the first
 *    5 decisions written during deployment — only queried when outside the
 *    sliding range to avoid duplicate requests.
 *
 * All getLogs calls are parallel; individual failures are silently skipped.
 */
export async function fetchRecentDecisions(limit = 50): Promise<OnChainDecision[]> {
  if (!LOGGER_ADDRESS) return [];

  const latest = await publicClient.getBlockNumber();
  const logParams = { address: LOGGER_ADDRESS, event: DECISION_LOGGED_EVENT } as const;
  const totalLookback = WINDOW_SIZE * BigInt(NUM_WINDOWS);
  const oldestCovered = latest > totalLookback ? latest - totalLookback : 0n;

  const slidingPromises = Array.from({ length: NUM_WINDOWS }, (_, i) => {
    const to   = latest - BigInt(i) * WINDOW_SIZE;
    const from = to > WINDOW_SIZE ? to - WINDOW_SIZE : 0n;
    return publicClient.getLogs({ ...logParams, fromBlock: from, toBlock: to }).catch(() => []);
  });

  const initialPromise = oldestCovered > INITIAL_WINDOW_TO
    ? publicClient.getLogs({ ...logParams, fromBlock: INITIAL_WINDOW_FROM, toBlock: INITIAL_WINDOW_TO }).catch(() => [])
    : Promise.resolve([]);

  const allLogs = (await Promise.all([...slidingPromises, initialPromise])).flat();

  // Deduplicate (windows share boundaries; initial can overlap sliding range).
  const seen = new Set<string>();
  const dedupedLogs = allLogs.filter((log) => {
    const key = log.transactionHash ?? '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const decisions: OnChainDecision[] = dedupedLogs.map((log) => {
    const args = log.args as {
      agentId?: bigint;
      asset?: Address;
      action?: number;
      riskScore?: number;
      reasonHash?: Hex;
      policyHash?: Hex;
      timestamp?: bigint;
      caller?: Address;
    };
    const actionIndex = Number(args.action ?? 0);
    return {
      txHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      agentId: args.agentId ?? 0n,
      assetAddress: (args.asset ?? '0x0') as Address,
      action: ACTION_LABELS[actionIndex] ?? 'HOLD',
      actionIndex,
      riskScore: Number(args.riskScore ?? 0),
      reasonHash: args.reasonHash ?? '0x',
      policyHash: args.policyHash ?? '0x',
      timestamp: Number(args.timestamp ?? 0n) * 1000,
      caller: (args.caller ?? '0x0') as Address,
    };
  });

  // Most recent first.
  decisions.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return decisions.slice(0, limit);
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * All assets the agent currently monitors. Source of truth for the dashboard.
 * Every address is a real Mantle mainnet ERC-20 — xStock addresses resolved
 * from the xStocks public API and verified on-chain 2026-05-21.
 */
export const TRACKED_ASSETS = [
  { symbol: 'NVDAx', reference: 'NVDA', kind: 'tokenized_equity' as const, market: 'NASDAQ' as const, address: '0xc845b2894dBddd03858fd2D643B4eF725fE0849d' as Address },
  { symbol: 'TSLAx', reference: 'TSLA', kind: 'tokenized_equity' as const, market: 'NASDAQ' as const, address: '0x8aD3c73F833d3F9A523aB01476625F269aEB7Cf0' as Address },
  { symbol: 'SPYx',  reference: 'SPY',  kind: 'tokenized_equity' as const, market: 'NYSE' as const,   address: '0x90A2a4c76b5D8c0bc892A69EA28Aa775a8f2dD48' as Address },
  { symbol: 'SPCXx', reference: 'SPCX', kind: 'tokenized_equity' as const, market: 'NASDAQ' as const, address: '0x68fa48B1C2FE52b3D776E1953e0E782b5044Ce28' as Address },
  { symbol: 'USDY',  kind: 'yield_bearing' as const, address: '0x5bE26527e817998A7206475496fDE1E68957c5A6' as Address },
  { symbol: 'mETH',  kind: 'yield_bearing' as const, address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0' as Address },
] as const;

export type TrackedAsset = (typeof TRACKED_ASSETS)[number];

export function findTrackedAsset(symbol: string): TrackedAsset | undefined {
  return TRACKED_ASSETS.find((a) => a.symbol === symbol);
}

/**
 * Decisions for a single asset, most recent first.
 * Reads all events then filters client-side — fine at our volume.
 */
export async function fetchDecisionsForAsset(asset: Address, limit = 20): Promise<OnChainDecision[]> {
  const all = await fetchRecentDecisions(500);
  return all.filter((d) => d.assetAddress.toLowerCase() === asset.toLowerCase()).slice(0, limit);
}

/**
 * Latest decision per tracked asset. Useful for the market-map overview.
 * Returns one entry per asset (or null if no decision yet for that asset).
 */
export async function fetchLatestPerAsset(): Promise<
  Array<{ asset: TrackedAsset; latest: OnChainDecision | null }>
> {
  const all = await fetchRecentDecisions(500);
  return TRACKED_ASSETS.map((asset) => {
    const latest =
      all.find((d) => d.assetAddress.toLowerCase() === asset.address.toLowerCase()) ?? null;
    return { asset, latest };
  });
}

/** Map an action label to a coarse status bucket for color/badge UI. */
export function statusFor(action: ActionLabel | null, riskScore: number | null): {
  label: string;
  classes: string;
} {
  if (!action) return { label: 'No data', classes: 'bg-zinc-50 text-zinc-600 ring-zinc-200' };
  if (action === 'PAUSE' || action === 'REQUIRE_HUMAN_CONFIRMATION') {
    return { label: 'Paused', classes: 'bg-rose-50 text-rose-700 ring-rose-200' };
  }
  if (action === 'REDUCE' || action === 'MOVE_TO_STABLE_YIELD') {
    return { label: 'Risk', classes: 'bg-orange-50 text-orange-700 ring-orange-200' };
  }
  if ((riskScore ?? 0) >= 300) {
    return { label: 'Watch', classes: 'bg-amber-50 text-amber-700 ring-amber-200' };
  }
  return { label: 'Safe', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
}
