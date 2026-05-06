import { createPublicClient, http, type Address, type Hex, parseAbiItem } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';

const RPC_URL = process.env.MANTLE_SEPOLIA_RPC ?? 'https://rpc.sepolia.mantle.xyz';

export const LOGGER_ADDRESS = (process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS ??
  '') as Address;

export const AGENT_ADDRESS = (process.env.NEXT_PUBLIC_RWA_AGENT_ADDRESS ?? '') as Address;

export const EXPLORER_TX = 'https://sepolia.mantlescan.xyz/tx';
export const EXPLORER_ADDR = 'https://sepolia.mantlescan.xyz/address';
export const EXPLORER_BLOCK = 'https://sepolia.mantlescan.xyz/block';

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
 * Asset address → display symbol map. The agent currently writes events using
 * placeholder addresses (0x…0001…0005) until the real Mantle xStock token
 * addresses are wired in. Update this map (and the agent's ASSET_REGISTRY)
 * once we have the canonical Fluxion token addresses.
 */
const ASSET_BY_ADDRESS: Record<string, { symbol: string; reference?: string }> = {
  '0x0000000000000000000000000000000000000001': { symbol: 'NVDAx', reference: 'NVDA' },
  '0x0000000000000000000000000000000000000002': { symbol: 'TSLAx', reference: 'TSLA' },
  '0x0000000000000000000000000000000000000003': { symbol: 'SPYx', reference: 'SPY' },
  '0x0000000000000000000000000000000000000004': { symbol: 'USDY' },
  '0x0000000000000000000000000000000000000005': { symbol: 'mETH' },
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
  chain: mantleSepoliaTestnet,
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

/**
 * Pull the most recent N DecisionLogged events from RWADecisionLogger on
 * Mantle Sepolia. Reads from a fixed `fromBlock` to keep the RPC query small.
 *
 * Why a fixed floor: Mantle Sepolia public RPC caps log range queries; this
 * window covers everything from our first deploy (block ~38239100) onward
 * and stays well under any cap. Bump if needed when blocks get older.
 */
export async function fetchRecentDecisions(limit = 50): Promise<OnChainDecision[]> {
  if (!LOGGER_ADDRESS) return [];

  const FLOOR_BLOCK = 38239100n;
  const logs = await publicClient.getLogs({
    address: LOGGER_ADDRESS,
    event: DECISION_LOGGED_EVENT,
    fromBlock: FLOOR_BLOCK,
    toBlock: 'latest',
  });

  const decisions: OnChainDecision[] = logs.map((log) => {
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

/** All assets the agent currently monitors. Source of truth for the dashboard. */
export const TRACKED_ASSETS = [
  { symbol: 'NVDAx', reference: 'NVDA', kind: 'tokenized_equity' as const, market: 'NASDAQ' as const, address: '0x0000000000000000000000000000000000000001' as Address },
  { symbol: 'TSLAx', reference: 'TSLA', kind: 'tokenized_equity' as const, market: 'NASDAQ' as const, address: '0x0000000000000000000000000000000000000002' as Address },
  { symbol: 'SPYx',  reference: 'SPY',  kind: 'tokenized_equity' as const, market: 'NYSE' as const,   address: '0x0000000000000000000000000000000000000003' as Address },
  { symbol: 'USDY',  kind: 'yield_bearing' as const, address: '0x0000000000000000000000000000000000000004' as Address },
  { symbol: 'mETH',  kind: 'yield_bearing' as const, address: '0x0000000000000000000000000000000000000005' as Address },
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
