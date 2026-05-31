"use client";

import { useEffect, useMemo, useState } from "react";
import { keccak256, stringToBytes, type Hex } from "viem";
import { XStocksDecisionBreakdown } from "./XStocksDecisionBreakdown";

interface Props {
  txHash: Hex;
  reasonHash: Hex;
  policyHash: Hex;
}

type CacheEntry = { canonicalJson: string };
type SourceState = "live" | "stub" | "simulated" | "n/a";

interface ParsedDecision {
  schema: string;
  agentId: string;
  timestamp: number;
  asset: {
    symbol: string;
    kind: string;
    reference: string | null;
    market: string | null;
  };
  sources: Record<string, SourceState>;
  snapshot: Record<string, string | number | boolean | null>;
  breakdown: {
    marketHoursPenalty?: number;
    total: number;
  };
  policy: {
    name: string;
    blockAfterHoursEquity: boolean;
    maxRiskForAllocate: number;
    fallbackYieldAsset: string;
  };
  action: string;
  riskScore: number;
  reason: string;
  xstocks?: {
    indicativePriceUsd: number | null;
    priceSource: string | null;
    marketTradingHalted: boolean | null;
    atomicTradingHalted: boolean | null;
  } | null;
  narration: {
    model: string | null;
    fromLlm: boolean;
  };
  aiProposal?: {
    proposedAction: string;
    confidence: number;
    rationale: string;
    model: string;
  } | null;
  policyReview?: {
    finalAction: string;
    decision: 'APPROVE' | 'OVERRIDE';
    overrideReason?: string;
  } | null;
}

const STORAGE_PREFIX = "neutrino:decision:";
const EXPLORER_TX = "https://mantlescan.xyz/tx";

function readCache(txHash: Hex): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${txHash.toLowerCase()}`);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function fetchFromApi(reasonHash: Hex): Promise<CacheEntry | null> {
  try {
    const res = await fetch(`/api/receipts/${reasonHash}`);
    if (!res.ok) return null;
    const data = await res.json() as { canonicalJson?: string };
    if (!data.canonicalJson) return null;
    return { canonicalJson: data.canonicalJson };
  } catch {
    return null;
  }
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
      }}
      className="rounded px-2 py-0.5 text-[10px] font-mono transition-all shrink-0"
      style={{
        background: copied ? "rgba(45,212,165,0.15)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(45,212,165,0.3)" : "rgba(255,255,255,0.08)"}`,
        color: copied ? "var(--bb-teal)" : "var(--bb-muted)",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function ExportCopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
      }}
      className="rounded-lg px-3 py-2 text-xs font-mono font-medium transition-all"
      style={{
        background: copied ? "rgba(45,212,165,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${copied ? "rgba(45,212,165,0.3)" : "rgba(255,255,255,0.08)"}`,
        color: copied ? "var(--bb-teal)" : "var(--bb-text)",
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function DownloadJsonButton({ filename, value }: { filename: string; value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const blob = new Blob([value], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="rounded-lg px-3 py-2 text-xs font-mono font-medium transition-all"
      style={{
        background: "rgba(45,212,165,0.08)",
        border: "1px solid rgba(45,212,165,0.2)",
        color: "var(--bb-teal)",
      }}
    >
      Download receipt JSON
    </button>
  );
}

export function DecisionVerifier({ txHash, reasonHash, policyHash }: Props) {
  const [cache, setCache] = useState<CacheEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<null | "ok" | "mismatch">(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readCache(txHash);
      if (local) {
        if (!cancelled) { setCache(local); setLoading(false); }
        return;
      }
      const remote = await fetchFromApi(reasonHash);
      if (!cancelled) { setCache(remote); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [txHash, reasonHash]);

  const recomputed: Hex | null = useMemo(() => {
    if (!cache) return null;
    return keccak256(stringToBytes(cache.canonicalJson));
  }, [cache]);

  const parsed = useMemo(() => {
    if (!cache) return null;
    try { return JSON.parse(cache.canonicalJson) as ParsedDecision; }
    catch { return null; }
  }, [cache]);

  const receiptExport = useMemo(() => {
    if (!parsed || !cache) return null;
    return {
      asset: parsed.asset.symbol,
      aiProposal: parsed.aiProposal ?? null,
      policyReview: parsed.policyReview ?? null,
      finalAction: parsed.policyReview?.finalAction ?? parsed.action,
      riskScore: parsed.riskScore,
      reasonHash,
      policyHash,
      txHash,
      timestamp: parsed.timestamp ?? null,
      canonicalReceipt: parsed,
      canonicalJson: cache.canonicalJson,
    };
  }, [cache, parsed, policyHash, reasonHash, txHash]);

  const integrationPayload = useMemo(() => {
    if (!parsed) return null;
    return {
      agentId: parsed.agentId,
      asset: parsed.asset.symbol,
      intent: "rebalance",
      aiProposal: parsed.aiProposal ?? null,
      policyReview: parsed.policyReview ?? null,
      finalAction: parsed.policyReview?.finalAction ?? parsed.action,
      riskScore: parsed.riskScore,
      reasonHash,
      policyHash,
      txHash,
      timestamp: parsed.timestamp ?? null,
    };
  }, [parsed, policyHash, reasonHash, txHash]);

  const receiptExportJson = receiptExport ? JSON.stringify(receiptExport, null, 2) : "";
  const integrationPayloadJson = integrationPayload ? JSON.stringify(integrationPayload, null, 2) : "";

  function verify() {
    if (!recomputed) return;
    setVerified(recomputed.toLowerCase() === reasonHash.toLowerCase() ? "ok" : "mismatch");
  }

  if (loading) {
    return (
      <section
        className="rounded-xl p-6 animate-pulse"
        style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
      >
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--bb-muted)" }}>
          Loading receipt…
        </p>
      </section>
    );
  }

  if (!cache) {
    return (
      <section
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--bb-panel)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-widest mb-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
          >
            DECISION RECEIPT
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--bb-text)" }}>
            Canonical payload not in cache
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
            The full audit JSON is generated by{" "}
            <code className="rounded px-1 py-0.5 text-[11px]" style={{ background: "rgba(255,255,255,0.06)", color: "var(--bb-teal)" }}>
              /api/run-agent
            </code>{" "}
            and stored per browser session. Fresh runs also populate the server receipt cache; when KV/Upstash env vars are configured, receipts persist durably by reasonHash.
          </p>
        </div>
        <div
          className="rounded-lg px-4 py-3 space-y-1"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "var(--bb-muted)" }}
            >
              ON-CHAIN REASON HASH
            </span>
            <CopyBtn value={reasonHash} />
          </div>
          <p className="font-mono text-xs break-all" style={{ color: "rgba(138,148,166,0.6)" }}>
            {reasonHash}
          </p>
        </div>
      </section>
    );
  }

  const actionColor =
    parsed?.action === "PAUSE" ? "var(--bb-orange)"
    : parsed?.action === "ALLOCATE" ? "var(--bb-teal)"
    : "var(--bb-amber)";

  const verifiedColor = verified === "ok" ? "var(--bb-teal)" : verified === "mismatch" ? "var(--bb-red)" : "var(--bb-muted)";

  return (
    <section className="space-y-5">
      {/* Hero status bar */}
      <div
        className="rounded-xl px-6 py-5 flex flex-wrap items-center gap-4"
        style={{
          background: verified === "ok"
            ? "rgba(45,212,165,0.06)"
            : verified === "mismatch"
              ? "rgba(232,72,85,0.06)"
              : "var(--bb-panel)",
          border: `1px solid ${verified === "ok" ? "rgba(45,212,165,0.25)" : verified === "mismatch" ? "rgba(232,72,85,0.25)" : "rgba(255,255,255,0.08)"}`,
          transition: "all 0.3s ease",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-medium uppercase tracking-widest mb-1"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
          >
            DECISION RECEIPT · neutrino.decision.v2
          </p>
          <p
            className="text-2xl font-bold tracking-wider"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: verifiedColor }}
          >
            {verified === "ok"
              ? "✓ VERIFIED MATCH"
              : verified === "mismatch"
                ? "✗ HASH MISMATCH"
                : "RECEIPT LOADED"}
          </p>
          {verified === "ok" && (
            <p className="mt-1 text-xs" style={{ color: "rgba(45,212,165,0.6)" }}>
              keccak256(canonicalJson) = on-chain reasonHash — receipt is authentic
            </p>
          )}
          {verified === "mismatch" && (
            <p className="mt-1 text-xs" style={{ color: "rgba(232,72,85,0.6)" }}>
              Hash mismatch — payload may be stale or tampered
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {parsed && (
            <div
              className="rounded-lg px-4 py-2 text-center"
              style={{ background: `${actionColor}14`, border: `1px solid ${actionColor}40` }}
            >
              <p className="text-[9px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "var(--bb-muted)" }}>ACTION</p>
              <p className="text-lg font-bold tracking-wider" style={{ color: actionColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                {parsed.action}
              </p>
            </div>
          )}
          {parsed && (
            <div
              className="rounded-lg px-4 py-2 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-[9px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "var(--bb-muted)" }}>RISK SCORE</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {parsed.riskScore}<span className="text-xs font-normal" style={{ color: "var(--bb-muted)" }}>/1000</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Agent Responsibility Receipt — three-panel summary */}
      {parsed?.aiProposal && parsed?.policyReview && (
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Panel 1 — AI Proposal */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(120,104,212,0.07)", border: "1px solid rgba(120,104,212,0.2)" }}
          >
            <p
              className="text-[9px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(155,143,232,0.7)" }}
            >
              AI Proposal
            </p>
            <div className="flex items-center gap-2">
              <ActionPill action={parsed.aiProposal.proposedAction} />
              <span
                className="text-[10px] tabular-nums"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(155,143,232,0.6)" }}
              >
                {Math.round(parsed.aiProposal.confidence * 100)}% conf.
              </span>
            </div>
            <p
              className="text-[10px] leading-relaxed line-clamp-4"
              style={{ color: "rgba(235,229,215,0.55)" }}
            >
              {parsed.aiProposal.rationale}
            </p>
            <p
              className="text-[9px]"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(155,143,232,0.4)" }}
            >
              model: {parsed.aiProposal.model}
            </p>
          </div>

          {/* Panel 2 — Policy Review */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: parsed.policyReview.decision === 'OVERRIDE'
                ? "rgba(255,107,53,0.06)"
                : "rgba(45,212,165,0.05)",
              border: `1px solid ${parsed.policyReview.decision === 'OVERRIDE' ? "rgba(255,107,53,0.2)" : "rgba(45,212,165,0.18)"}`,
            }}
          >
            <p
              className="text-[9px] font-medium uppercase tracking-widest"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: parsed.policyReview.decision === 'OVERRIDE'
                  ? "rgba(255,107,53,0.7)"
                  : "rgba(45,212,165,0.6)",
              }}
            >
              Policy Review
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="rounded px-2 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-wide"
                style={{
                  background: parsed.policyReview.decision === 'OVERRIDE'
                    ? "rgba(255,107,53,0.15)"
                    : "rgba(45,212,165,0.12)",
                  color: parsed.policyReview.decision === 'OVERRIDE'
                    ? "var(--bb-orange)"
                    : "var(--bb-teal)",
                }}
              >
                {parsed.policyReview.decision}
              </span>
              <ActionPill action={parsed.policyReview.finalAction} />
            </div>
            {parsed.policyReview.overrideReason ? (
              <p
                className="text-[10px] leading-relaxed"
                style={{
                  color: "rgba(235,229,215,0.55)",
                }}
              >
                {parsed.policyReview.overrideReason}
              </p>
            ) : (
              <p
                className="text-[10px]"
                style={{ color: "rgba(45,212,165,0.5)", fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Risk-based proposal accepted.
              </p>
            )}
          </div>

          {/* Panel 3 — On-chain Commitment */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(45,212,165,0.04)", border: "1px solid rgba(45,212,165,0.15)" }}
          >
            <p
              className="text-[9px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(45,212,165,0.55)" }}
            >
              On-chain Commitment
            </p>
            <ActionPill action={parsed.action} />
            <div className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
                  riskScore
                </span>
                <span className="text-[10px] tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(235,229,215,0.6)" }}>
                  {parsed.riskScore}<span style={{ color: "rgba(138,148,166,0.35)" }}>/1000</span>
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
                  reasonHash
                </span>
                <span className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: "rgba(45,212,165,0.55)" }}>
                  {reasonHash.slice(0, 10)}…
                </span>
              </div>
            </div>
            <a
              href={`${EXPLORER_TX}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] font-mono transition-opacity hover:opacity-80"
              style={{ color: "var(--bb-teal)" }}
            >
              {txHash.slice(0, 10)}…{txHash.slice(-4)} ↗ Mantlescan
            </a>
            <p
              className="text-[9px] leading-relaxed pt-1"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: "rgba(45,212,165,0.35)",
                borderTop: "1px solid rgba(45,212,165,0.1)",
              }}
            >
              AI proposes, policy validates or overrides, Mantle verifies the final receipt.
            </p>
          </div>
        </div>
      )}

      {receiptExport && integrationPayload && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
              >
                RECEIPT EXPORTS
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
                Reuse this decision in an agent log, governance post, GitHub issue, or downstream
                policy system.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportCopyButton label="Copy canonical receipt" value={receiptExportJson} />
              <ExportCopyButton label="Copy integration payload" value={integrationPayloadJson} />
              <DownloadJsonButton
                filename={`neutrino-${receiptExport.asset}-${reasonHash.slice(2, 10)}.json`}
                value={receiptExportJson}
              />
            </div>
          </div>
        </div>
      )}

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: decision summary */}
        <div className="space-y-4">
          {parsed && (
            <>
              {/* Asset + reason */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
              >
                <div>
                  <p
                    className="text-[10px] font-medium uppercase tracking-widest mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
                  >
                    ASSET
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold" style={{ color: "var(--bb-text)" }}>
                      {parsed.asset.symbol}
                    </span>
                    <span className="text-xs" style={{ color: "var(--bb-muted)" }}>
                      {parsed.asset.kind.replace("_", " ")}
                      {parsed.asset.reference ? ` · references ${parsed.asset.reference}` : ""}
                      {parsed.asset.market ? ` · ${parsed.asset.market}` : ""}
                    </span>
                  </div>
                </div>
                <div>
                  <p
                    className="text-[10px] font-medium uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
                  >
                    REASON (LLM NARRATION)
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(235,229,215,0.7)" }}>
                    {parsed.reason}
                  </p>
                  <p className="mt-2 text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
                    AI proposes · policy validates or overrides · Mantle verifies · llmControlsAction = false
                  </p>
                </div>
              </div>

              <XStocksDecisionBreakdown decision={parsed} />

              {/* Source matrix */}
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
              >
                <p
                  className="text-[10px] font-medium uppercase tracking-widest mb-3"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
                >
                  SOURCE MATRIX
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parsed.sources).map(([label, state]) => (
                    <SourceBadge key={label} label={label} state={state} />
                  ))}
                </div>
              </div>

              {/* xStocks data */}
              {parsed.xstocks && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
                >
                  <p
                    className="text-[10px] font-medium uppercase tracking-widest mb-3"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
                  >
                    xSTOCKS PUBLIC API (LIVE READ-ONLY)
                  </p>
                  <div className="space-y-0">
                    {[
                      ["indicativePriceUsd", String(parsed.xstocks.indicativePriceUsd ?? "n/a")],
                      ["priceSource", parsed.xstocks.priceSource ?? "unavailable"],
                      ["marketTradingHalted", String(parsed.xstocks.marketTradingHalted ?? "n/a")],
                      ["atomicTradingHalted", String(parsed.xstocks.atomicTradingHalted ?? "n/a")],
                    ].map(([k, v]) => (
                      <div key={k} className="telemetry-row">
                        <span className="telemetry-label">{k}</span>
                        <span className="telemetry-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snapshot + policy */}
              <div className="grid grid-cols-2 gap-3">
                <DarkAuditCard
                  title="SNAPSHOT"
                  note="* modelled"
                  rows={[
                    ["onChainPrice", String(parsed.snapshot.onChainPrice ?? "n/a")],
                    ["referencePrice", String(parsed.snapshot.referencePrice ?? "n/a")],
                    ["spreadBps*", String(parsed.snapshot.spreadBps ?? "n/a")],
                    ["volume24hUsd*", String(parsed.snapshot.volume24hUsd ?? "n/a")],
                    ["marketOpen", String(parsed.snapshot.marketOpen ?? "n/a")],
                  ]}
                />
                <DarkAuditCard
                  title="POLICY"
                  rows={[
                    ["name", parsed.policy.name],
                    ["blockAfterHours", String(parsed.policy.blockAfterHoursEquity)],
                    ["maxAllocateRisk", String(parsed.policy.maxRiskForAllocate)],
                    ["fallback", parsed.policy.fallbackYieldAsset],
                    ["llmControlsAction", "false"],
                  ]}
                />
              </div>
            </>
          )}
        </div>

        {/* Right: hash proof */}
        <div className="space-y-4">
          {/* Verify button + status */}
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
            >
              HASH VERIFICATION
            </p>

            {/* On-chain hash */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
                ON-CHAIN REASON HASH (RWADecisionLogger)
              </p>
              <div
                className="rounded-lg px-3 py-2 flex items-start gap-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="font-mono text-[11px] break-all flex-1" style={{ color: "rgba(138,148,166,0.7)" }}>
                  {reasonHash}
                </p>
                <CopyBtn value={reasonHash} />
              </div>
            </div>

            {/* Recomputed hash */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}>
                RECOMPUTED: keccak256(canonicalJson)
              </p>
              <div
                className="rounded-lg px-3 py-2 flex items-start gap-2"
                style={{
                  background: verified === "ok" ? "rgba(45,212,165,0.06)" : verified === "mismatch" ? "rgba(232,72,85,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${verified === "ok" ? "rgba(45,212,165,0.2)" : verified === "mismatch" ? "rgba(232,72,85,0.2)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.3s ease",
                }}
              >
                <p
                  className="font-mono text-[11px] break-all flex-1"
                  style={{ color: verified === "ok" ? "var(--bb-teal)" : verified === "mismatch" ? "var(--bb-red)" : "rgba(138,148,166,0.7)" }}
                >
                  {recomputed ?? "—"}
                </p>
                {recomputed && <CopyBtn value={recomputed} />}
              </div>
            </div>

            {/* Verify button + status */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={verify}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: "var(--bb-teal)",
                  color: "#070A0F",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Verify hash
              </button>
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--bb-muted)",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {showJson ? "Hide JSON" : "View canonical JSON"}
              </button>
            </div>

            {/* Mantlescan link */}
            <div
              className="rounded-lg px-3 py-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="telemetry-row">
                <span className="telemetry-label">TX</span>
                <a
                  href={`${EXPLORER_TX}/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs"
                  style={{ color: "var(--bb-teal)" }}
                >
                  {txHash.slice(0, 14)}…{txHash.slice(-6)} ↗
                </a>
              </div>
            </div>
          </div>

          {/* Reproduce section */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
            >
              REPRODUCE LOCALLY
            </p>
            <ol className="space-y-3">
              {[
                ["01", "Click View canonical JSON and copy the raw string (no re-formatting)."],
                ["02", <>Compute{" "}<code style={{ background: "rgba(45,212,165,0.1)", color: "var(--bb-teal)", borderRadius: 3, padding: "0 4px" }}>keccak256(stringToBytes(json))</code>{" "}using viem, ethers.js, or cast.</>],
                ["03", <>Compare result against the on-chain <code style={{ background: "rgba(255,255,255,0.06)", color: "var(--bb-muted)", borderRadius: 3, padding: "0 4px" }}>reasonHash</code> in the <code style={{ background: "rgba(255,255,255,0.06)", color: "var(--bb-muted)", borderRadius: 3, padding: "0 4px" }}>DecisionLogged</code> event on Mantlescan.</>],
                ["04", <>Re-run: <code style={{ background: "rgba(255,255,255,0.06)", color: "var(--bb-muted)", borderRadius: 3, padding: "0 4px", fontSize: 10 }}>git clone … && cd web && cp .env.example .env.local && pnpm dev</code></>],
              ].map(([n, text]) => (
                <li key={String(n)} className="flex gap-3">
                  <span
                    className="shrink-0 text-[10px] font-mono font-semibold mt-0.5"
                    style={{ color: "var(--bb-teal)", minWidth: 20 }}
                  >
                    {n}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
                    {text}
                  </span>
                </li>
              ))}
            </ol>
            <p
              className="text-[10px] leading-relaxed pt-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.4)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              The JSON is byte-stable. Re-hash it with keccak256 and you get the same bytes32 emitted by RWADecisionLogger.DecisionLogged.reasonHash.
            </p>
          </div>
        </div>
      </div>

      {/* Canonical JSON */}
      {showJson && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bb-panel)", border: "1px solid rgba(45,212,165,0.15)" }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
            >
              CANONICAL JSON · byte-stable · do not re-stringify before hashing
            </p>
            <CopyBtn value={cache.canonicalJson} />
          </div>
          <pre
            className="max-h-96 overflow-auto rounded-lg p-4 text-[11px] leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(235,229,215,0.7)",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {prettyJson(cache.canonicalJson)}
          </pre>
        </div>
      )}

      {/* Footer */}
      <p
        className="text-[11px] leading-relaxed"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.4)" }}
      >
        * spreadBps and volume24hUsd are modelled — the xStocks public API can expose indicative price and
        trading status, but price is marked stub when the quote is null. Every field is covered by the on-chain reasonHash.
      </p>
    </section>
  );
}

function ActionPill({ action }: { action: string }) {
  const color =
    action === "PAUSE" ? "var(--bb-orange)"
    : action === "ALLOCATE" ? "var(--bb-teal)"
    : action === "REDUCE" ? "var(--bb-amber)"
    : action === "HOLD" ? "var(--bb-amber)"
    : "var(--bb-muted)";
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-wide"
      style={{ background: `${color}18`, border: `1px solid ${color}45`, color }}
    >
      {action}
    </span>
  );
}

function SourceBadge({ label, state }: { label: string; state: SourceState }) {
  const cls =
    state === "live" ? "badge-live"
    : state === "stub" ? "badge-stub"
    : state === "simulated" ? "badge-notexec"
    : "badge-na";
  return (
    <span className={`${cls} inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-widest`}>
      {label}: {state}
    </span>
  );
}

function DarkAuditCard({ title, rows, note }: { title: string; rows: Array<[string, string]>; note?: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p
        className="text-[9px] font-medium uppercase tracking-widest mb-2"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
      >
        {title}
      </p>
      <div className="space-y-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 py-0.5">
            <span
              className="text-[10px] shrink-0"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}
            >
              {k}
            </span>
            <span
              className="text-[10px] text-right break-all"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(235,229,215,0.6)" }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
      {note && (
        <p className="mt-2 text-[9px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.35)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function prettyJson(json: string): string {
  try { return JSON.stringify(JSON.parse(json), null, 2); }
  catch { return json; }
}
