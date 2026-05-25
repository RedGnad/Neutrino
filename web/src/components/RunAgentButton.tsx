"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    xStockStatus: SourceState;
    onChainWrite: SourceState;
  };
  txHash?: string;
  blockNumber?: string;
  error?: string;
}

interface ExecutionStep {
  label: string;
  txHash: string;
  blockNumber: string;
}

interface ExecutionResult {
  action: "allocate" | "move-to-stable-yield";
  txHash: string;
  approveTxHash?: string;
  description: string;
  blockNumber: string;
  steps?: ExecutionStep[];
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
    xStockStatus: FlagState;
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
const RUN_LOCK_EVENT = "neutrino:run-lock";

let activeRunId: string | null = null;

function broadcastRunLock() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RUN_LOCK_EVENT));
}

interface RunAgentButtonProps {
  scenario?: Scenario;
  executeOnChain?: boolean;
  label: string;
  variant?: "primary" | "secondary" | "execute";
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
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    function syncLock() { setLocked(Boolean(activeRunId)); }
    window.addEventListener(RUN_LOCK_EVENT, syncLock);
    syncLock();
    return () => window.removeEventListener(RUN_LOCK_EVENT, syncLock);
  }, []);

  async function run() {
    if (activeRunId) { setLocked(true); return; }
    const runId = crypto.randomUUID();
    activeRunId = runId;
    setLocked(true);
    broadcastRunLock();
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
        setState({ kind: "error", message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      const result = json as RunResult;
      cacheCanonicalJsons(result);
      setState({ kind: "done", result });
      router.refresh();
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    } finally {
      if (activeRunId === runId) {
        activeRunId = null;
        setLocked(false);
        broadcastRunLock();
      }
    }
  }

  const running = state.kind === "running";
  const disabled = running || (locked && activeRunId !== null);

  const btnStyle =
    variant === "execute"
      ? { background: "var(--bb-teal)", color: "#070A0F" }
      : variant === "secondary"
        ? { background: "rgba(255,255,255,0.05)", color: "var(--bb-text)", border: "1px solid rgba(255,255,255,0.1)" }
        : { background: "rgba(255,255,255,0.08)", color: "var(--bb-text)", border: "1px solid rgba(255,255,255,0.12)" };

  const btnDisabledStyle = { opacity: 0.4, cursor: "not-allowed" };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-all"
        style={{ ...btnStyle, ...(disabled ? btnDisabledStyle : {}) }}
      >
        {running ? <><Spinner /> Running…</> : label}
      </button>

      {locked && !running ? (
        <p className="text-xs" style={{ color: "var(--bb-amber)", fontFamily: "'IBM Plex Mono', monospace" }}>
          Another run is in progress. Wait for it to finish.
        </p>
      ) : null}
      {hint ? (
        <p className="text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
          {hint}
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: "rgba(232,72,85,0.1)", border: "1px solid rgba(232,72,85,0.3)", color: "var(--bb-red)" }}
        >
          {state.message}
        </div>
      ) : null}

      {state.kind === "done" ? (
        <ResultPanel result={state.result} scenario={scenario} />
      ) : null}
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
        JSON.stringify({ canonicalJson: r.canonicalJson, cachedAt: Date.now() }),
      );
    } catch { /* localStorage full */ }
  }
}

function ResultPanel({ result, scenario }: { result: RunResult; scenario?: Scenario }) {
  const written = result.results.filter((r) => r.txHash).length;
  const pending = result.results.filter((r) => r.txHash && r.blockNumber === "0").length;
  const explorerTx =
    result.network === "mantle"
      ? "https://mantlescan.xyz/tx"
      : "https://sepolia.mantlescan.xyz/tx";
  const networkLabel = result.network === "mantle" ? "Mantle Mainnet" : "Mantle Sepolia";
  const firstWritten = result.results.find((r) => r.txHash);

  return (
    <div
      className="space-y-4 rounded-xl p-5 mt-2"
      style={{ background: "var(--bb-panel)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Summary header */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <p className="font-semibold" style={{ color: "var(--bb-text)" }}>
          {written}/{result.results.length} receipts on-chain
          {pending > 0 ? (
            <span className="ml-1 font-normal" style={{ color: "var(--bb-amber)" }}>
              ({pending} confirming)
            </span>
          ) : null}
        </p>
        <p style={{ color: "var(--bb-muted)" }}>
          {(result.durationMs / 1000).toFixed(1)}s · {networkLabel} ·{" "}
          US market{" "}
          <span className="font-medium" style={{ color: result.marketOpen ? "var(--bb-teal)" : "var(--bb-orange)" }}>
            {result.marketOpen ? "open" : "closed"}
          </span>
        </p>
      </div>

      {/* Pipeline flags */}
      <PipelineFlags inputs={result.inputs} />

      {/* Engine / LLM split */}
      <div
        className="rounded-md px-4 py-2.5 text-xs flex flex-wrap gap-x-6 gap-y-1"
        style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)" }}
      >
        <span>
          <span className="font-semibold" style={{ color: "var(--bb-text)" }}>Deterministic engine</span>
          <span style={{ color: "var(--bb-muted)" }}> decided action + risk score</span>
        </span>
        <span>
          <span
            className="font-semibold"
            style={{ color: result.inputs.llmReasoning === "live" ? "#9D84FF" : "var(--bb-muted)" }}
          >
            {result.inputs.llmReasoning === "live"
              ? `LLM (${result.narrationModel ?? "claude-haiku"}) narrated`
              : "LLM unavailable — deterministic fallback reason"}
          </span>
          <span style={{ color: "var(--bb-muted)" }}> — LLM never controls the action</span>
        </span>
      </div>

      {/* RFQ readiness */}
      {(scenario === "risky-xstocks" || scenario === "default") ? (
        <RfqReadinessBlock results={result.results} />
      ) : null}

      {/* Per-asset results */}
      <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {result.results.map((r) => (
          <AssetRow key={r.symbol} r={r} explorerTx={explorerTx} />
        ))}
      </ul>

      {/* Execution result */}
      {result.execution ? (
        <ExecutionBlock execution={result.execution} explorerTx={explorerTx} />
      ) : null}

      {result.executionError ? (
        <div
          className="rounded-md px-4 py-3 text-xs leading-relaxed"
          style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", color: "var(--bb-amber)" }}
        >
          <p className="font-mono font-semibold uppercase tracking-wider text-[10px] mb-1">Execution did not settle</p>
          {result.executionError}
        </div>
      ) : null}

      {/* Footer links */}
      <div
        className="flex flex-wrap items-center gap-3 pt-3 text-xs"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Link href="/proof" className="font-medium transition-colors" style={{ color: "var(--bb-teal)" }}>
          View all on-chain receipts →
        </Link>
        {firstWritten ? (
          <Link
            href={`/agent-decision/${firstWritten.symbol}`}
            className="font-medium transition-colors"
            style={{ color: "var(--bb-teal)" }}
          >
            Verify {firstWritten.symbol} receipt →
          </Link>
        ) : null}
        {result.narrationModel ? (
          <span className="ml-auto font-mono" style={{ color: "rgba(138,148,166,0.4)" }}>
            narration: {result.narrationModel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AssetRow({ r, explorerTx }: { r: PerAssetResult; explorerTx: string }) {
  const actionColor =
    r.action === "PAUSE" || r.action === "REDUCE"
      ? "var(--bb-orange)"
      : r.action === "ALLOCATE"
        ? "var(--bb-teal)"
        : "var(--bb-amber)";

  return (
    <li className="space-y-2 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span
          className="w-14 font-mono font-semibold"
          style={{ color: "var(--bb-text)" }}
        >
          {r.symbol}
        </span>
        <span
          className="w-36 font-mono font-semibold text-xs tracking-wide"
          style={{ color: actionColor }}
        >
          {r.action}
        </span>
        <span className="tabular-nums text-xs" style={{ color: "var(--bb-muted)" }}>
          {r.riskScore}
          <span style={{ color: "rgba(138,148,166,0.4)" }}>/1000</span>
        </span>
        <span className="flex-1 text-right">
          {r.txHash ? (
            <>
              <a
                href={`${explorerTx}/${r.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs"
                style={{ color: "var(--bb-teal)" }}
              >
                {r.txHash.slice(0, 16)}…
              </a>
              {r.blockNumber && r.blockNumber !== "0" ? (
                <span className="ml-1.5 text-[10px] font-mono" style={{ color: "rgba(138,148,166,0.4)" }}>
                  block {r.blockNumber}
                </span>
              ) : (
                <span className="ml-1.5 text-[10px] font-mono" style={{ color: "var(--bb-amber)" }}>
                  confirming…
                </span>
              )}
            </>
          ) : (
            <span className="text-xs font-mono" style={{ color: "var(--bb-red)" }}>
              {r.error ?? "no tx"}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-start gap-2 pl-14">
        <span
          className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
          style={
            r.reasonFromLlm
              ? { background: "rgba(124,92,252,0.15)", color: "#9D84FF", border: "1px solid rgba(124,92,252,0.25)" }
              : { background: "rgba(255,255,255,0.05)", color: "var(--bb-muted)", border: "1px solid rgba(255,255,255,0.07)" }
          }
          title={r.reasonFromLlm ? "Narrated by Claude Haiku 4.5" : "Deterministic fallback"}
        >
          {r.reasonFromLlm ? "LLM" : "auto"}
        </span>
        <span className="text-xs italic leading-relaxed" style={{ color: "var(--bb-muted)" }}>
          {r.reason}
        </span>
      </div>

      <SourceBadges sources={r.sources} />
    </li>
  );
}

function PipelineFlags({ inputs }: { inputs: RunResult["inputs"] }) {
  const flags = [
    { label: "Market hours", state: inputs.marketHours },
    { label: "Ref prices", state: inputs.referencePrices },
    { label: "xStock price", state: inputs.xStockPrices },
    { label: "xStock status", state: inputs.xStockStatus },
    { label: "LLM", state: inputs.llmReasoning },
    { label: "On-chain write", state: inputs.onChainWrite },
    { label: "Execution", state: inputs.onChainExecution },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <span key={f.label} className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider ${sourceBadgeClass(f.state)}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sourceDotClass(f.state)}`} />
          {f.label}: {f.state}
        </span>
      ))}
    </div>
  );
}

function SourceBadges({ sources }: { sources: PerAssetResult["sources"] }) {
  const entries = [
    { label: "mkt-hours", state: sources.marketHours },
    { label: "ref-price", state: sources.referencePrice },
    { label: "xstock-price", state: sources.xStockPrice },
    { label: "xstock-status", state: sources.xStockStatus },
    { label: "on-chain", state: sources.onChainWrite },
  ];
  return (
    <div className="flex flex-wrap gap-1 pl-14">
      {entries.map((e) => (
        <span
          key={e.label}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase tracking-wider ${sourceBadgeClass(e.state)}`}
        >
          {e.label}: {e.state}
        </span>
      ))}
    </div>
  );
}

function sourceBadgeClass(s: SourceState | FlagState): string {
  switch (s) {
    case "live":      return "badge-live";
    case "stub":      return "badge-stub";
    case "simulated": return "badge-notexec";
    default:          return "badge-na";
  }
}

function sourceDotClass(s: SourceState | FlagState): string {
  switch (s) {
    case "live":      return "bg-[var(--bb-teal)]";
    case "stub":      return "bg-[var(--bb-amber)]";
    case "simulated": return "bg-[#9D84FF]";
    default:          return "bg-[var(--bb-muted)]";
  }
}

function RfqReadinessBlock({ results }: { results: PerAssetResult[] }) {
  const atomicHalted = results.some((r) => {
    if (!r.canonicalJson) return false;
    try {
      const p = JSON.parse(r.canonicalJson) as { xstocks?: { atomicTradingHalted?: boolean | null } };
      return p.xstocks?.atomicTradingHalted === true;
    } catch { return false; }
  });

  return (
    <div
      className="rounded-md px-4 py-3 text-xs leading-relaxed flex items-start gap-2"
      style={{ background: "rgba(124,92,252,0.06)", border: "1px solid rgba(124,92,252,0.2)" }}
    >
      <span className="shrink-0 mt-0.5 font-mono text-[10px] font-semibold" style={{ color: "#9D84FF" }}>RFQ</span>
      <div>
        <span className="font-semibold" style={{ color: "#9D84FF" }}>xChange / Atomic RFQ readiness: </span>
        {atomicHalted ? (
          <span className="font-mono" style={{ color: "var(--bb-red)" }}>
            blocked — xStocks API reports <code>atomicTradingHalted = true</code>
          </span>
        ) : (
          <span style={{ color: "var(--bb-muted)" }}>
            not executed — requires API key + registered wallet + authenticated quote flow.
            Execution routes through Fluxion V3 only.
          </span>
        )}
      </div>
    </div>
  );
}

function ExecutionBlock({ execution, explorerTx }: { execution: ExecutionResult; explorerTx: string }) {
  return (
    <div
      className="rounded-md px-4 py-3 text-sm space-y-2"
      style={{ background: "rgba(45,212,165,0.06)", border: "1px solid rgba(45,212,165,0.25)" }}
    >
      <p
        className="text-[10px] font-mono font-semibold uppercase tracking-widest"
        style={{ color: "var(--bb-teal)" }}
      >
        ON-CHAIN EXECUTION SETTLED
      </p>
      <p style={{ color: "var(--bb-muted)" }}>{execution.description}</p>
      <ul className="space-y-1">
        {(execution.steps ?? [{ label: "swap", txHash: execution.txHash, blockNumber: execution.blockNumber }]).map(
          (step, i) => (
            <li key={step.txHash} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-medium" style={{ color: "rgba(138,148,166,0.5)" }}>Leg {i + 1}</span>
              <span style={{ color: "var(--bb-muted)" }}>{step.label}</span>
              <a
                href={`${explorerTx}/${step.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono"
                style={{ color: "var(--bb-teal)" }}
              >
                {step.txHash.slice(0, 18)}…
              </a>
              <span className="text-[10px] font-mono" style={{ color: "rgba(138,148,166,0.4)" }}>
                block {step.blockNumber}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
