import type { Address, Hex } from 'viem';
import { NextResponse, type NextRequest } from 'next/server';
import { runAgentOnce, type ExecutionConfig, type Scenario } from '@/lib/agent/run';

// Streaming-friendly Node runtime; default in Next.js 16, but be explicit.
export const runtime = 'nodejs';
// Force fresh execution every time (no static caching of POST results).
export const dynamic = 'force-dynamic';
// Each run can take up to ~120s (5 reference fetches + 5 LLM calls + 5 on-chain
// writes + optional swap). Bump the function timeout accordingly.
export const maxDuration = 180;

let runQueue: Promise<void> = Promise.resolve();

async function queueRun<T>(task: () => Promise<T>): Promise<T> {
  const previous = runQueue;
  let release!: () => void;
  runQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
  }
}

function resolveNetwork(): { network: 'mantle' | 'mantle_sepolia'; rpcUrl: string | undefined } {
  const declared = (process.env.NEUTRINO_NETWORK ?? 'mantle_sepolia') as 'mantle' | 'mantle_sepolia';
  const network = declared === 'mantle' ? 'mantle' : 'mantle_sepolia';
  const explicit = process.env.MANTLE_RPC;
  const rpcUrl =
    explicit ??
    (network === 'mantle' ? process.env.MANTLE_MAINNET_RPC : process.env.MANTLE_SEPOLIA_RPC);
  return { network, rpcUrl };
}

function resolveExecution(
  network: 'mantle' | 'mantle_sepolia',
  override?: { enabled: boolean; action?: 'allocate' | 'move-to-stable-yield' },
): ExecutionConfig | undefined {
  const enabledByEnv = process.env.EXECUTE_ON_CHAIN === 'true';
  const enabled = override?.enabled ?? enabledByEnv;
  if (!enabled) return undefined;
  if (network !== 'mantle') return undefined;

  const action =
    override?.action ??
    ((process.env.EXECUTE_ACTION ?? 'allocate') as
      | 'allocate'
      | 'move-to-stable-yield');

  const amountRaw = process.env.EXECUTE_AMOUNT_USDC_BASE_UNITS ?? '1000000';
  const amountUsdcBaseUnits = BigInt(amountRaw);

  const slippageBps = process.env.EXECUTE_SLIPPAGE_BPS
    ? Number(process.env.EXECUTE_SLIPPAGE_BPS)
    : 50;

  return { action, amountUsdcBaseUnits, slippageBps };
}

interface RequestBody {
  scenario?: Scenario;
  /** If true, force on-chain execution for this run regardless of EXECUTE_ON_CHAIN env. */
  execute?: boolean;
  /** Override the default execution action when `execute` is true. */
  executeAction?: 'allocate' | 'move-to-stable-yield';
}

async function readBody(request: NextRequest): Promise<RequestBody> {
  try {
    const raw = await request.text();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RequestBody;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);
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
    const result = await queueRun(() =>
      runAgentOnce({
        network,
        rpcUrl,
        privateKey,
        loggerAddress,
        agentId: BigInt(agentIdRaw),
        twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || undefined,
        execution: resolveExecution(network, {
          enabled: body.execute ?? (process.env.EXECUTE_ON_CHAIN === 'true'),
          action: body.executeAction,
        }),
        scenario: body.scenario,
      }),
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
