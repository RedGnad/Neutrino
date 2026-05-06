'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PerAssetResult {
  symbol: string;
  action: string;
  riskScore: number;
  reason: string;
  reasonFromLlm: boolean;
  txHash?: string;
  blockNumber?: string;
  error?: string;
}

interface RunResult {
  startedAt: number;
  durationMs: number;
  marketOpen: boolean;
  inputs: {
    marketHoursLive: boolean;
    referencePricesLive: boolean;
    xStockPricesLive: boolean;
    onChainWriteLive: boolean;
    llmReasoningLive: boolean;
  };
  narrationModel?: string;
  policyName: string;
  results: PerAssetResult[];
}

const EXPLORER_TX = 'https://sepolia.mantlescan.xyz/tx';

export function RunAgentButton() {
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'running'; startedAt: number }
    | { kind: 'done'; result: RunResult }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function run() {
    setState({ kind: 'running', startedAt: Date.now() });
    try {
      const res = await fetch('/api/run-agent', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setState({ kind: 'error', message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setState({ kind: 'done', result: json as RunResult });
      // Refresh the RSC pages so /proof and /market-map pick up the new events.
      router.refresh();
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  }

  const running = state.kind === 'running';

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {running ? (
          <>
            <Spinner /> Running on-chain…
          </>
        ) : (
          <>▶ Run agent now</>
        )}
      </button>

      {state.kind === 'error' ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === 'done' ? <ResultPanel result={state.result} /> : null}
    </div>
  );
}

function ResultPanel({ result }: { result: RunResult }) {
  const written = result.results.filter((r) => r.txHash).length;
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <p className="font-medium text-zinc-900">
          {written}/{result.results.length} decisions written on-chain
        </p>
        <p className="text-zinc-600">
          {(result.durationMs / 1000).toFixed(1)}s · policy{' '}
          <span className="font-medium text-zinc-900">{result.policyName}</span> · US market{' '}
          <span className="font-medium text-zinc-900">
            {result.marketOpen ? 'open' : 'closed'}
          </span>
        </p>
      </div>

      <PipelineFlags inputs={result.inputs} />

      <ul className="divide-y divide-zinc-100">
        {result.results.map((r) => (
          <li key={r.symbol} className="space-y-1 py-3 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="w-12 font-medium text-zinc-950">{r.symbol}</span>
              <span className="w-44 font-medium text-zinc-700">{r.action}</span>
              <span className="w-16 tabular-nums text-zinc-600">
                {r.riskScore}
                <span className="text-zinc-400">/1000</span>
              </span>
              <span className="flex-1 truncate">
                {r.txHash ? (
                  <a
                    href={`${EXPLORER_TX}/${r.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                  >
                    {r.txHash.slice(0, 16)}…
                  </a>
                ) : (
                  <span className="text-xs text-rose-600">{r.error ?? 'no tx'}</span>
                )}
              </span>
            </div>
            <div className="flex items-baseline gap-2 pl-12 text-xs leading-relaxed text-zinc-600">
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-sm px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  r.reasonFromLlm
                    ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                    : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'
                }`}
                title={r.reasonFromLlm ? 'Narrated by LLM' : 'Deterministic fallback (LLM not configured or failed)'}
              >
                {r.reasonFromLlm ? 'LLM' : 'auto'}
              </span>
              <span className="italic">{r.reason}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-zinc-500">
        New events will appear in <a href="/proof" className="text-emerald-700 underline-offset-2 hover:underline">/proof</a> and{' '}
        <a href="/market-map" className="text-emerald-700 underline-offset-2 hover:underline">/market-map</a>.
        {result.narrationModel ? (
          <>
            {' '}Narration model: <code className="rounded bg-zinc-100 px-1 py-0.5">{result.narrationModel}</code>.
          </>
        ) : null}
      </p>
    </div>
  );
}

function PipelineFlags({ inputs }: { inputs: RunResult['inputs'] }) {
  const flags = [
    { label: 'Market hours', live: inputs.marketHoursLive },
    { label: 'Reference prices', live: inputs.referencePricesLive },
    { label: 'xStock prices (Fluxion)', live: inputs.xStockPricesLive },
    { label: 'LLM reasoning', live: inputs.llmReasoningLive },
    { label: 'On-chain write', live: inputs.onChainWriteLive },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <span
          key={f.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
            f.live
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-amber-50 text-amber-800 ring-amber-200'
          }`}
        >
          <span className={f.live ? 'h-1.5 w-1.5 rounded-full bg-emerald-500' : 'h-1.5 w-1.5 rounded-full bg-amber-500'} />
          {f.label}: {f.live ? 'live' : 'stub'}
        </span>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
