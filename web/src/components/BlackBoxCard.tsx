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

export function BlackBoxCard({ data = DEMO_DATA, label = "SIMULATED PREVIEW", className = "" }: BlackBoxCardProps) {
  const scanRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const action = data.action ?? "PAUSE";
  const actionColor =
    action === "PAUSE"
      ? "var(--bb-orange)"
      : action === "ALLOCATE"
        ? "var(--bb-teal)"
        : "var(--bb-amber)";

  const rows = [
    { k: "ASSET", v: data.asset ?? "—" },
    { k: "SIGNAL", v: data.signal ?? "—" },
    { k: "RFQ", v: data.rfqReadiness ?? "auth-gated" },
    { k: "SCORE", v: typeof data.score === "number" ? `${data.score} / 1000` : data.score ?? "—" },
  ];

  return (
    <div
      className={`bb-card relative select-none ${className}`}
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      {/* Scanline */}
      <div
        key={tick}
        className="bb-scanline animate-scanline"
        style={{ top: 0 }}
        ref={scanRef}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full animate-live"
            style={{ background: data.live ? "var(--bb-teal)" : "#E84855" }}
          />
          <span
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[10px] font-mono"
          style={{ color: data.live ? "var(--bb-teal)" : "var(--bb-muted)" }}
        >
          {data.live ? "● LIVE" : "● DEMO"}
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

      {/* Decision — the centrepiece */}
      <div
        className="mx-4 mb-3 rounded-md px-4 py-3 text-center"
        style={{
          background: `${actionColor}14`,
          border: `1px solid ${actionColor}40`,
        }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
        >
          AGENT DECISION
        </p>
        <p
          className="text-2xl font-bold tracking-wider"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: actionColor }}
        >
          {action}
        </p>
      </div>

      {/* Footer */}
      <div
        className="px-4 pb-4 space-y-1"
      >
        <div className="telemetry-row">
          <span className="telemetry-label">RECEIPT</span>
          <span className="telemetry-value" style={{ color: "var(--bb-muted)", fontSize: 11 }}>
            {data.receiptHash ?? "—"}
          </span>
        </div>
        <div className="telemetry-row">
          <span className="telemetry-label">LOGGED</span>
          <span className="telemetry-value">{data.timestamp ?? "Mantle mainnet"}</span>
        </div>
        <div className="telemetry-row">
          <span className="telemetry-label">VERIFIED</span>
          <span
            className="telemetry-value font-semibold"
            style={{ color: data.verified ? "var(--bb-teal)" : "var(--bb-muted)" }}
          >
            {data.verified === true ? "✓ MATCH" : data.verified === false ? "✗ MISMATCH" : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
