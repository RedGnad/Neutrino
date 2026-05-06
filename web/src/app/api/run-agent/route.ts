import type { Address, Hex } from 'viem';
import { NextResponse } from 'next/server';
import { runAgentOnce, type ExecutionConfig } from '@/lib/agent/run';

// Streaming-friendly Node runtime; default in Next.js 16, but be explicit.
export const runtime = 'nodejs';
// Force fresh execution every time (no static caching of POST results).
export const dynamic = 'force-dynamic';

/**
 * Resolve the active network for log writes. Two env knobs:
 *   - NEUTRINO_NETWORK: 'mantle' (mainnet) or 'mantle_sepolia' (legacy). Default 'mantle_sepolia'.
 *   - MANTLE_RPC: explicit override; otherwise use MANTLE_SEPOLIA_RPC or MANTLE_MAINNET_RPC.
 *
 * The on-chain decision logger address is the same env var (NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS)
 * regardless of network — set it to whichever deployment matches NEUTRINO_NETWORK.
 */
function resolveNetwork(): { network: 'mantle' | 'mantle_sepolia'; rpcUrl: string | undefined } {
  const declared = (process.env.NEUTRINO_NETWORK ?? 'mantle_sepolia') as 'mantle' | 'mantle_sepolia';
  const network = declared === 'mantle' ? 'mantle' : 'mantle_sepolia';
  const explicit = process.env.MANTLE_RPC;
  const rpcUrl =
    explicit ??
    (network === 'mantle' ? process.env.MANTLE_MAINNET_RPC : process.env.MANTLE_SEPOLIA_RPC);
  return { network, rpcUrl };
}

/**
 * Pull the optional on-chain execution config from env. Execution is opt-in:
 * if EXECUTE_ON_CHAIN is not "true" we skip it entirely.
 */
function resolveExecution(network: 'mantle' | 'mantle_sepolia'): ExecutionConfig | undefined {
  if (process.env.EXECUTE_ON_CHAIN !== 'true') return undefined;
  if (network !== 'mantle') return undefined; // execution requires mainnet

  const action = (process.env.EXECUTE_ACTION ?? 'move-to-stable-yield') as
    | 'allocate'
    | 'move-to-stable-yield';

  // Default to 1 USDC for demo runs — keeps cost trivial. 1 USDC = 1_000_000 base units.
  const amountRaw = process.env.EXECUTE_AMOUNT_USDC_BASE_UNITS ?? '1000000';
  const amountUsdcBaseUnits = BigInt(amountRaw);

  const slippageBps = process.env.EXECUTE_SLIPPAGE_BPS
    ? Number(process.env.EXECUTE_SLIPPAGE_BPS)
    : 50;

  return { action, amountUsdcBaseUnits, slippageBps };
}

export async function POST() {
  const { network, rpcUrl } = resolveNetwork();
  const privateKey = process.env.AGENT_RUNNER_PRIVATE_KEY as Hex | undefined;
  const loggerAddress = process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS as Address | undefined;
  const agentIdRaw = process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ?? '1';

  if (!rpcUrl || !privateKey || !loggerAddress) {
    return NextResponse.json(
      {
        error:
          'Missing env. Need a Mantle RPC, AGENT_RUNNER_PRIVATE_KEY, and NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS in web/.env.local.',
      },
      { status: 500 },
    );
  }

  try {
    const result = await runAgentOnce({
      network,
      rpcUrl,
      privateKey,
      loggerAddress,
      agentId: BigInt(agentIdRaw),
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || undefined,
      execution: resolveExecution(network),
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
