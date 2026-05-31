"use client";

import { useEffect, useState } from "react";

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
  rfqReadiness: "verified rail required",
  score: 480,
  action: "PAUSE",
  receiptHash: "run agent to generate",
  verified: undefined,
  timestamp: "Mantle mainnet",
  live: false,
};

function verdictStyle(action: string): { text: string; border: string; bg: string } {
  if (action === "PAUSE" || action === "REDUCE")
    return { text: "var(--pause)", border: "rgba(191,160,94,0.35)", bg: "rgba(191,160,94,0.06)" };
  if (action === "ALLOCATE")
    return {
      text: "var(--clear)",
      border: "color-mix(in srgb, var(--clear) 35%, transparent)",
      bg: "color-mix(in srgb, var(--clear) 8%, transparent)",
    };
  return { text: "var(--seal)", border: "rgba(191,160,94,0.35)", bg: "rgba(191,160,94,0.06)" };
}

export function BlackBoxCard({ data = DEMO_DATA, label = "SIMULATED PREVIEW", className = "" }: BlackBoxCardProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, []);

  const action = data.action ?? "PAUSE";
  const vs = verdictStyle(action);

  const rows = [
    { k: "ASSET",  v: data.asset ?? "—" },
    { k: "SIGNAL", v: data.signal ?? "—" },
    { k: "RFQ",    v: data.rfqReadiness ?? "verified rail required" },
    { k: "SCORE",  v: typeof data.score === "number" ? `${data.score} / 1000` : data.score ?? "—" },
  ];

  return (
    <div
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
      {/* Corner crop marks */}
      <div className="absolute pointer-events-none" style={{ top: 8, right: 8, width: 10, height: 10, borderTop: "1px solid var(--border-hi)", borderRight: "1px solid var(--border-hi)" }} />
      <div className="absolute pointer-events-none" style={{ bottom: 8, left: 8, width: 10, height: 10, borderBottom: "1px solid var(--border-hi)", borderLeft: "1px solid var(--border-hi)" }} />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full animate-live"
            style={{ background: data.live ? "var(--clear)" : "var(--muted)" }}
          />
          <span
            className="uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 500, color: "var(--muted)" }}
          >
            {label}
          </span>
        </div>
        <span
          style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", color: data.live ? "var(--clear)" : "rgba(144,126,108,0.4)" }}
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

      {/* Verdict — prints left-to-right each cycle */}
      <div
        key={`verdict-${tick}`}
        className="mx-4 mb-3 rounded animate-verdict"
        style={{ background: vs.bg, border: `1px solid ${vs.border}`, padding: "12px 16px" }}
      >
        <p
          className="uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 500, color: "var(--muted)" }}
        >
          AGENT VERDICT
        </p>
        <p
          className="leading-none"
          style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: "1.7rem", color: vs.text, fontWeight: 700 }}
        >
          {action === "PAUSE" ? "Refused." : action === "ALLOCATE" ? "Cleared." : action}
        </p>
        {action === "PAUSE" && (
          <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", color: "rgba(209,64,64,0.55)", marginTop: "4px" }}>
            after-hours equity · execution blocked
          </p>
        )}
        {action === "ALLOCATE" && (
          <p style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>
            risk within policy · execution permitted
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-0">
        <div className="telemetry-row">
          <span className="telemetry-label">RECEIPT</span>
          <span
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "11px", color: "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
              style={{ color: data.verified ? "var(--clear)" : "var(--muted)" }}
            >
              {data.verified === true ? "✓ MATCH" : "—"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
