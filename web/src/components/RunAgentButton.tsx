"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { parseXStocksDecision, XStocksDecisionBreakdown } from "./XStocksDecisionBreakdown";

type Scenario = "default" | "risky-xstocks" | "safe-yield" | "spacex";
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

const LOADING_STEPS: { ms: number; label: string }[] = [
  { ms: 0,     label: "Fetching market signals" },
  { ms: 5000,  label: "Checking xStocks status" },
  { ms: 12000, label: "Calling AI for proposal" },
  { ms: 20000, label: "Running policy review" },
  { ms: 30000, label: "Writing to Mantle" },
  { ms: 42000, label: "Awaiting confirmation" },
];

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
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    function syncLock() { setLocked(Boolean(activeRunId)); }
    window.addEventListener(RUN_LOCK_EVENT, syncLock);
    syncLock();
    return () => window.removeEventListener(RUN_LOCK_EVENT, syncLock);
  }, []);

  useEffect(() => {
    if (state.kind !== "running") { setLoadingStep(0); return; }
    const timers = LOADING_STEPS.map((step, i) =>
      setTimeout(() => setLoadingStep(i), step.ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [state.kind]);

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
      // First refresh: fires as soon as the receipt is confirmed.
      // Second refresh (5 s later): catches cases where the RPC node hasn't
      // propagated the new block yet at the time of the first refresh.
      router.refresh();
      setTimeout(() => router.refresh(), 5000);
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

  const btnBase =
    "console-action inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-all active:scale-[0.97]";

  const btnStyle =
    variant === "execute"
      ? { background: "var(--seal)", color: "#080705" }
      : variant === "secondary"
        ? { background: "rgba(200,168,110,0.06)", color: "var(--text)", border: "1px solid var(--border-hi)" }
        : { background: "var(--clear)", color: "#060504" };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={disabled}
        className={btnBase}
        style={{ ...btnStyle, ...(disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
      >
        {running ? <><Spinner /> {LOADING_STEPS[loadingStep]?.label ?? "Running"}…</> : label}
      </button>

      {locked && !running ? (
        <p className="text-xs" style={{ color: "var(--seal)" }}>
          Another run is in progress.
        </p>
      ) : null}
      {hint && !running ? (
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: "rgba(232,72,85,0.1)", border: "1px solid rgba(232,72,85,0.3)", color: "var(--refuse)" }}
        >
          {state.message}
        </div>
      ) : null}

      {state.kind === "done" ? (
        <ResultDrawer result={state.result} scenario={scenario} />
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

function ResultDrawer({ result, scenario }: { result: RunResult; scenario?: Scenario }) {
  const [open, setOpen] = useState(true);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const written = result.results.filter((r) => r.txHash).length;

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const drawerPortal = portalTarget ? createPortal(
    <>
      <div
        className={`result-drawer-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`result-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="result-drawer-header">
          <div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              Policy receipt
            </span>
            <span className="ml-3 text-[12px]" style={{ color: "var(--muted)" }}>
              {written}/{result.results.length} on-chain · {(result.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded transition-opacity hover:opacity-70"
            style={{ color: "var(--muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="result-drawer-body">
          <ResultPanel result={result} scenario={scenario} />
        </div>
      </div>
    </>,
    portalTarget,
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-semibold transition-opacity hover:opacity-80"
        style={{ color: "var(--clear)" }}
      >
        View receipt →
      </button>
      {drawerPortal}
    </>
  );
}

function ResultPanel({ result, scenario }: { result: RunResult; scenario?: Scenario }) {
  const explorerTx =
    result.network === "mantle"
      ? "https://mantlescan.xyz/tx"
      : "https://sepolia.mantlescan.xyz/tx";
  const networkLabel = result.network === "mantle" ? "Mantle Mainnet" : "Mantle Sepolia";
  const firstWritten = result.results.find((r) => r.txHash);

  return (
    <div className="space-y-3">
      {/* Context strip */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md px-4 py-2.5 text-[12px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--muted)" }}>{networkLabel}</span>
        <span style={{ color: "var(--muted)" }}>
          Market{" "}
          <span style={{ color: result.marketOpen ? "var(--clear)" : "var(--pause)", fontWeight: 600 }}>
            {result.marketOpen ? "open" : "closed"}
          </span>
        </span>
        <span style={{ color: "var(--muted)" }}>{result.policyName}</span>
        {result.narrationModel ? (
          <span style={{ color: "rgba(144,126,108,0.45)", fontFamily: "'Azeret Mono', monospace" }}>
            {result.narrationModel}
          </span>
        ) : null}
      </div>

      {/* Per-asset receipts */}
      <div className="space-y-2">
        {result.results.map((r) => (
          <AssetReceipt key={r.symbol} r={r} explorerTx={explorerTx} />
        ))}
      </div>

      {/* Execution result */}
      {result.execution ? (
        <ExecutionBlock execution={result.execution} explorerTx={explorerTx} />
      ) : null}

      {result.executionError ? (
        <div
          className="rounded-md px-4 py-3 text-xs leading-relaxed"
          style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", color: "var(--seal)" }}
        >
          <p className="font-semibold uppercase tracking-wider text-[10px] mb-1">Execution did not settle</p>
          {result.executionError}
        </div>
      ) : null}

      {/* Technical breakdown — collapsible */}
      <details className="group">
        <summary
          className="cursor-pointer list-none rounded px-3 py-2 text-[11px] font-semibold uppercase tracking-wider select-none transition-colors hover:bg-white/[0.03]"
          style={{ color: "rgba(144,126,108,0.55)" }}
        >
          Pipeline signals ↓
        </summary>
        <div className="mt-2 space-y-2">
          <PipelineFlags inputs={result.inputs} />
          {(scenario === "risky-xstocks" || scenario === "default") ? (
            <RfqReadinessBlock results={result.results} />
          ) : null}
        </div>
      </details>

      {/* Footer */}
      <div
        className="flex flex-wrap items-center gap-3 pt-3 text-[12px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Link href="/proof" className="font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
          All on-chain receipts →
        </Link>
        {firstWritten ? (
          <Link
            href={`/agent-decision/${firstWritten.symbol}`}
            className="font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--clear)" }}
          >
            Verify {firstWritten.symbol} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function AssetReceipt({ r, explorerTx }: { r: PerAssetResult; explorerTx: string }) {
  const xstocksDecision = parseXStocksDecision(r.canonicalJson);
  const actionColor =
    r.action === "PAUSE" || r.action === "REDUCE" ? "var(--pause)" :
    r.action === "ALLOCATE" ? "var(--clear)" :
    r.action === "REFUSE" ? "var(--refuse)" :
    "var(--seal)";
  const actionBg =
    r.action === "PAUSE" || r.action === "REDUCE" ? "rgba(245,166,35,0.07)" :
    r.action === "ALLOCATE" ? "rgba(47,234,131,0.06)" :
    r.action === "REFUSE" ? "rgba(232,72,85,0.07)" :
    "rgba(200,168,110,0.06)";

  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{ background: actionBg, border: `1px solid ${actionColor}26` }}
    >
      {/* Top row: symbol + action + risk */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[17px] font-bold" style={{ color: "var(--text)" }}>
            {r.symbol}
          </span>
          <span className="text-[20px] font-bold tracking-tight" style={{ color: actionColor }}>
            {r.action}
          </span>
        </div>
        <span
          className="font-mono text-[22px] font-bold tabular-nums"
          style={{ color: actionColor }}
        >
          {r.riskScore}
          <span className="text-[13px] font-normal" style={{ color: "rgba(144,126,108,0.40)" }}>/1000</span>
        </span>
      </div>

      {/* Reason */}
      <p className="text-[13px] italic leading-relaxed" style={{ color: "var(--muted)" }}>
        {r.reason}
        {r.reasonFromLlm ? (
          <span
            className="ml-2 not-italic rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(145,136,183,0.15)", color: "var(--gated)", border: "1px solid rgba(145,136,183,0.2)" }}
          >
            AI
          </span>
        ) : null}
      </p>

      {/* On-chain receipt */}
      {r.txHash ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(144,126,108,0.50)" }}>
            On-chain receipt
          </span>
          <div className="flex items-center gap-3">
            <a
              href={`${explorerTx}/${r.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--clear)" }}
            >
              {r.txHash.slice(0, 10)}…{r.txHash.slice(-6)}
            </a>
            {r.blockNumber && r.blockNumber !== "0" ? (
              <span className="font-mono text-[11px]" style={{ color: "rgba(144,126,108,0.42)" }}>
                block {r.blockNumber}
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: "var(--seal)" }}>confirming…</span>
            )}
          </div>
        </div>
      ) : r.error ? (
        <p className="text-[12px] font-mono" style={{ color: "var(--refuse)" }}>{r.error}</p>
      ) : null}

      {/* Data sources inline */}
      <SourceBadges sources={r.sources} />

      {xstocksDecision ? (
        <XStocksDecisionBreakdown decision={xstocksDecision} compact />
      ) : null}
    </div>
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
        <span key={f.label} className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider ${sourceBadgeClass(f.state)}`}>
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
    <div className="flex flex-wrap gap-1">
      {entries.map((e) => (
        <span
          key={e.label}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider ${sourceBadgeClass(e.state)}`}
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
      style={{ background: "rgba(145,136,183,0.06)", border: "1px solid rgba(145,136,183,0.2)" }}
    >
      <span className="shrink-0 mt-0.5 font-mono text-[10px] font-semibold" style={{ color: "var(--gated)" }}>RFQ</span>
      <div>
        <span className="font-semibold" style={{ color: "var(--gated)" }}>xStocks execution gate: </span>
        {atomicHalted ? (
          <span className="font-mono" style={{ color: "var(--refuse)" }}>
            xStocks API reports atomicTradingHalted — current policy outcome is PAUSE.
          </span>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            Signal may be tradable, but xStocks execution is gated — no verified RFQ rail configured.
          </span>
        )}
      </div>
    </div>
  );
}

function ExecutionBlock({ execution, explorerTx }: { execution: ExecutionResult; explorerTx: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm space-y-2"
      style={{ background: "color-mix(in srgb, var(--clear) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--clear) 25%, transparent)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--clear)" }}>
        On-chain execution settled
      </p>
      <p style={{ color: "var(--muted)" }}>{execution.description}</p>
      <ul className="space-y-1">
        {(execution.steps ?? [{ label: "swap", txHash: execution.txHash, blockNumber: execution.blockNumber }]).map(
          (step, i) => (
            <li key={step.txHash} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-medium" style={{ color: "rgba(138,148,166,0.5)" }}>Leg {i + 1}</span>
              <span style={{ color: "var(--muted)" }}>{step.label}</span>
              <a
                href={`${explorerTx}/${step.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono transition-opacity hover:opacity-80"
                style={{ color: "var(--clear)" }}
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
