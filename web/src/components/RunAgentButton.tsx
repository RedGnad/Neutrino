"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type Scenario = "default" | "risky-xstocks" | "safe-yield";

type SourceState = "live" | "stub" | "simulated" | "n/a";
type FlagState = "live" | "stub" | "n/a";

interface PerAssetResult {
  symbol: string;
  action: string;
  riskScore: number;
  reason: string;
  reasonFromLlm: boolean;
  canonicalJson: string;
  canonicalHash: string;
  sources: {
    marketHours: SourceState;
    referencePrice: SourceState;
    xStockPrice: SourceState;
    onChainWrite: SourceState;
  };
  txHash?: string;
  blockNumber?: string;
  error?: string;
}

interface ExecutionResult {
  action: "allocate" | "move-to-stable-yield";
  txHash: string;
  approveTxHash?: string;
  description: string;
  blockNumber: string;
}

interface RunResult {
  startedAt: number;
  durationMs: number;
  marketOpen: boolean;
  network: "mantle" | "mantle_sepolia";
  scenario: Scenario;
  inputs: {
    marketHours: FlagState;
    referencePrices: FlagState;
    xStockPrices: FlagState;
    onChainWrite: FlagState;
    onChainExecution: FlagState;
    llmReasoning: FlagState;
  };
  narrationModel?: string;
  policyName: string;
  results: PerAssetResult[];
  execution?: ExecutionResult;
  executionError?: string;
}

const STORAGE_PREFIX = "neutrino:decision:";

interface RunAgentButtonProps {
  /** Scenario to send to /api/run-agent. Default = 'default' (all 5 assets). */
  scenario?: Scenario;
  /** Force on-chain execution after the decision loop (mainnet only). */
  executeOnChain?: boolean;
  /** Visible label on the button. */
  label: string;
  /** Visual variant. */
  variant?: "primary" | "secondary" | "execute";
  /** Optional one-line subtitle under the button explaining what happens. */
  hint?: string;
}

export function RunAgentButton({
  scenario,
  executeOnChain,
  label,
  variant = "primary",
  hint,
}: RunAgentButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "done"; result: RunResult }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function run() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/run-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenario: scenario ?? "default",
          execute: executeOnChain ?? false,
          executeAction: executeOnChain ? "allocate" : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({
          kind: "error",
          message: json.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const result = json as RunResult;
      cacheCanonicalJsons(result);
      setState({ kind: "done", result });
      router.refresh();
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  const running = state.kind === "running";
  const buttonClass =
    variant === "execute"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-300"
      : variant === "secondary"
        ? "bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 disabled:bg-zinc-50 disabled:text-zinc-400"
        : "bg-zinc-950 hover:bg-zinc-800 text-white disabled:bg-zinc-300";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed ${buttonClass}`}
      >
        {running ? (
          <>
            <Spinner /> Running on-chain…
          </>
        ) : (
          <>{label}</>
        )}
      </button>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}

      {state.kind === "error" ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "done" ? <ResultPanel result={state.result} /> : null}
    </div>
  );
}

function cacheCanonicalJsons(result: RunResult) {
  if (typeof window === "undefined") return;
  for (const r of result.results) {
    if (!r.txHash || !r.canonicalJson) continue;
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${r.txHash.toLowerCase()}`,
        JSON.stringify({
          canonicalJson: r.canonicalJson,
          cachedAt: Date.now(),
        }),
      );
    } catch {
      // localStorage full or disabled — ignore, verifier will show fallback.
    }
  }
}

function ResultPanel({ result }: { result: RunResult }) {
  const written = result.results.filter((r) => r.txHash).length;
  const explorerTx =
    result.network === "mantle"
      ? "https://mantlescan.xyz/tx"
      : "https://sepolia.mantlescan.xyz/tx";
  const networkLabel =
    result.network === "mantle" ? "Mantle Mainnet" : "Mantle Sepolia";
  const firstWritten = result.results.find((r) => r.txHash);

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <p className="font-medium text-zinc-900">
          {written}/{result.results.length} decisions written on-chain
        </p>
        <p className="text-zinc-600">
          {(result.durationMs / 1000).toFixed(1)}s · {networkLabel} · scenario{" "}
          <span className="font-medium text-zinc-900">{result.scenario}</span> ·
          US market{" "}
          <span className="font-medium text-zinc-900">
            {result.marketOpen ? "open" : "closed"}
          </span>
        </p>
      </div>

      <PipelineFlags inputs={result.inputs} />

      <ul className="divide-y divide-zinc-100">
        {result.results.map((r) => (
          <li key={r.symbol} className="space-y-1.5 py-3 text-sm">
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
                    href={`${explorerTx}/${r.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                  >
                    {r.txHash.slice(0, 16)}…
                  </a>
                ) : (
                  <span className="text-xs text-rose-600">
                    {r.error ?? "no tx"}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-baseline gap-2 pl-12 text-xs leading-relaxed text-zinc-600">
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-sm px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  r.reasonFromLlm
                    ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"
                }`}
                title={
                  r.reasonFromLlm
                    ? "Narrated by Claude Haiku 4.5"
                    : "Deterministic fallback (LLM unavailable)"
                }
              >
                {r.reasonFromLlm ? "LLM" : "auto"}
              </span>
              <span className="italic">{r.reason}</span>
            </div>
            <SourceBadges sources={r.sources} />
          </li>
        ))}
      </ul>

      {result.execution ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            On-chain execution
          </p>
          <p className="mt-1 text-zinc-900">{result.execution.description}</p>
          <p className="mt-1 text-xs text-zinc-600">
            block {result.execution.blockNumber} ·{" "}
            <a
              href={`${explorerTx}/${result.execution.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-700 underline-offset-2 hover:underline"
            >
              {result.execution.txHash.slice(0, 18)}…
            </a>
          </p>
        </div>
      ) : null}

      {result.executionError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Execution skipped: {result.executionError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
        <Link
          href="/proof"
          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          View all on-chain receipts →
        </Link>
        {firstWritten ? (
          <Link
            href={`/agent-decision/${firstWritten.symbol}`}
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Verify {firstWritten.symbol} receipt →
          </Link>
        ) : null}
        {result.narrationModel ? (
          <span className="ml-auto">
            Narration:{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              {result.narrationModel}
            </code>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PipelineFlags({ inputs }: { inputs: RunResult["inputs"] }) {
  const flags = [
    { label: "Market hours", state: inputs.marketHours },
    { label: "Reference prices", state: inputs.referencePrices },
    { label: "xStock prices (Fluxion)", state: inputs.xStockPrices },
    { label: "LLM reasoning", state: inputs.llmReasoning },
    { label: "On-chain write", state: inputs.onChainWrite },
    { label: "On-chain execution", state: inputs.onChainExecution },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <span
          key={f.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stateClasses(f.state)}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${stateDotClass(f.state)}`}
          />
          {f.label}: {f.state}
        </span>
      ))}
    </div>
  );
}

function SourceBadges({ sources }: { sources: PerAssetResult["sources"] }) {
  const entries = [
    { label: "market hours", state: sources.marketHours },
    { label: "reference", state: sources.referencePrice },
    { label: "xStock", state: sources.xStockPrice },
    { label: "on-chain", state: sources.onChainWrite },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 pl-12 text-[10px]">
      {entries.map((e) => (
        <span
          key={e.label}
          className={`inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium uppercase tracking-wider ring-1 ring-inset ${stateClasses(e.state)}`}
          title={`${e.label}: ${e.state}`}
        >
          {e.label}: {e.state}
        </span>
      ))}
    </div>
  );
}

function stateClasses(s: SourceState): string {
  switch (s) {
    case "live":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "stub":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "simulated":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "n/a":
    default:
      return "bg-zinc-100 text-zinc-500 ring-zinc-200";
  }
}

function stateDotClass(s: SourceState): string {
  switch (s) {
    case "live":
      return "bg-emerald-500";
    case "stub":
      return "bg-amber-500";
    case "simulated":
      return "bg-violet-500";
    case "n/a":
    default:
      return "bg-zinc-400";
  }
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
