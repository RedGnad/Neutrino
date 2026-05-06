import type { Address, Hex } from 'viem';
import { NextResponse } from 'next/server';
import { runAgentOnce } from '@/lib/agent/run';

// Streaming-friendly Node runtime; default in Next.js 16, but be explicit.
export const runtime = 'nodejs';
// Force fresh execution every time (no static caching of POST results).
export const dynamic = 'force-dynamic';

export async function POST() {
  const rpcUrl = process.env.MANTLE_SEPOLIA_RPC;
  const privateKey = process.env.AGENT_RUNNER_PRIVATE_KEY as Hex | undefined;
  const loggerAddress = process.env.NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS as Address | undefined;
  const agentIdRaw = process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ?? '1';

  if (!rpcUrl || !privateKey || !loggerAddress) {
    return NextResponse.json(
      {
        error:
          'Missing env. Need MANTLE_SEPOLIA_RPC, AGENT_RUNNER_PRIVATE_KEY, NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS in web/.env.local.',
      },
      { status: 500 },
    );
  }

  try {
    const result = await runAgentOnce({
      rpcUrl,
      privateKey,
      loggerAddress,
      agentId: BigInt(agentIdRaw),
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
