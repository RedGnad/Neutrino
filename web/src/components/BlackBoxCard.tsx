"use client";

import { useEffect, useRef, useState } from "react";

interface BlackBoxData {
  asset?: string;
  signal?: string;
  rfqReadiness?: string;
  score?: number | string;
  action?: "PAUSE" | "ALLOCATE" | "HOLD" | "REDUCE" | string;
  receiptHash?: string;
  verified?: boolean;
  timestamp?: string;
  live?: boolean;
}

interface BlackBoxCardProps {
  data?: BlackBoxData;
  label?: string;
  className?: string;
}

const DEMO_DATA: BlackBoxData = {
  asset: "TSLAx / TSLA",
  signal: "after-hours · no halt",
  rfqReadiness: "auth-gated",
  score: 480,
  action: "PAUSE",
  receiptHash: "run agent to generate",
  verified: undefined,
  timestamp: "Mantle mainnet",
  live: false,
};

// Verdict colour per action
function verdictStyle(action: string): { text: string; border: string; bg: string } {
  if (action === "PAUSE" || action === "REDUCE")
    return { text: "var(--terracotta)", border: "rgba(192,64,48,0.4)", bg: "rgba(192,64,48,0.06)" };
  if (action === "ALLOCATE")
    return { text: "var(--sage)", border: "rgba(61,138,98,0.4)", bg: "rgba(61,138,98,0.06)" };
  return { text: "var(--gold)", border: "rgba(200,166,74,0.4)", bg: "rgba(200,166,74,0.06)" };
}

export function BlackBoxCard({ data = DEMO_DATA, label = "SIMULATED PREVIEW", className = "" }: BlackBoxCardProps) {
  const [tick, setTick] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Re-trigger verdict stamp animation every 6s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, []);

  const action = data.action ?? "PAUSE";
  const vs = verdictStyle(action);

  const rows = [
    { k: "ASSET",  v: data.asset ?? "—" },
    { k: "SIGNAL", v: data.signal ?? "—" },
    { k: "RFQ",    v: data.rfqReadiness ?? "auth-gated" },
    { k: "SCORE",  v: typeof data.score === "number" ? `${data.score} / 1000` : data.score ?? "—" },
  ];

  return (
    <div
      ref={cardRef}
      className={`relative select-none ${className}`}
      style={{
        minWidth: 280,
        maxWidth: 340,
        background: "var(--panel)",
        border: `1px solid ${vs.border}`,
        borderLeft: `3px solid ${vs.text}`,
        borderRadius: "0 10px 10px 0",
      }}
    >
      {/* Corner crop marks — exhibit aesthetic */}
      <div
        className="absolute pointer-events-none"
        style={{ top: 8, right: 8, width: 10, height: 10, borderTop: "1px solid var(--border-hi)", borderRight: "1px solid var(--border-hi)" }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ bottom: 8, left: 8, width: 10, height: 10, borderBottom: "1px solid var(--border-hi)", borderLeft: "1px solid var(--border-hi)" }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full animate-live"
            style={{ background: data.live ? "var(--sage)" : "var(--muted)" }}
          />
          <span
            className="text-[9px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--muted)" }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[9px]"
          style={{ fontFamily: "'Azeret Mono', monospace", color: data.live ? "var(--sage)" : "rgba(122,146,130,0.4)" }}
        >
          {data.live ? "● LIVE" : "● PREVIEW"}
        </span>
      </div>

      {/* Telemetry rows */}
      <div className="px-4 py-3 space-y-0">
        {rows.map((r) => (
          <div key={r.k} className="telemetry-row">
            <span className="telemetry-label">{r.k}</span>
            <span className="telemetry-value">{r.v}</span>
          </div>
        ))}
      </div>

      {/* Verdict — the centrepiece. PAUSE renders as a heavy ruling stamp. */}
      <div
        key={`verdict-${tick}`}
        className="mx-4 mb-3 rounded animate-seal"
        style={{
          background: vs.bg,
          border: `1px solid ${vs.border}`,
          padding: "12px 16px",
        }}
      >
        <p
          className="text-[9px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--muted)" }}
        >
          AGENT VERDICT
        </p>
        {/* Fraunces italic for the verdict — the "unexpected" moment */}
        <p
          className="text-3xl italic leading-none tracking-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: vs.text, fontWeight: 600 }}
        >
          {action === "PAUSE" ? "Refused." : action === "ALLOCATE" ? "Cleared." : action}
        </p>
        {action === "PAUSE" && (
          <p className="mt-1 text-[10px]" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(192,64,48,0.5)" }}>
            after-hours equity · execution blocked
          </p>
        )}
        {action === "ALLOCATE" && (
          <p className="mt-1 text-[10px]" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(61,138,98,0.5)" }}>
            risk within policy · execution permitted
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-0">
        <div className="telemetry-row">
          <span className="telemetry-label">RECEIPT</span>
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {data.receiptHash ?? "—"}
          </span>
        </div>
        <div className="telemetry-row">
          <span className="telemetry-label">NETWORK</span>
          <span className="telemetry-value">{data.timestamp ?? "Mantle mainnet"}</span>
        </div>
        {data.verified !== undefined && (
          <div className="telemetry-row">
            <span className="telemetry-label">VERIFIED</span>
            <span
              className="telemetry-value font-semibold"
              style={{ color: data.verified ? "var(--sage)" : "var(--muted)" }}
            >
              {data.verified === true ? "✓ MATCH" : "—"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
