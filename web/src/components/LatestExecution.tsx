"use client";

import { useState } from "react";

const EXPLORER_TX = "https://mantlescan.xyz/tx";

const LEGS = [
  {
    n: 1,
    swap: "USDC → mETH",
    block: "95591939",
    tx: "0xbd5f817be6387c2cd052c414d9ff1f79f7e0298e926644bdfe8562d8421f2a8a",
  },
  {
    n: 2,
    swap: "mETH → USDC (demo unwind)",
    block: "95591942",
    tx: "0x5697e5a96f31c431d81cce936ae0a666f1d819427eddcc69d905a3f9fa2d3e6d",
  },
] as const;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
      className="rounded px-2 py-0.5 shrink-0 transition-all"
      style={{
        fontFamily: "'Azeret Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        background: copied ? "rgba(58,155,98,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${copied ? "rgba(58,155,98,0.3)" : "rgba(200,168,110,0.1)"}`,
        color: copied ? "var(--clear)" : "var(--muted)",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function LatestExecution() {
  return (
    <section className="section-proof seal relative overflow-hidden">
      {/* Corner mark */}
      <div className="absolute pointer-events-none" style={{ top: 8, right: 8, width: 10, height: 10, borderTop: "1px solid var(--border-hi)", borderRight: "1px solid var(--border-hi)" }} />

      {/* Header */}
      <div className="mb-6">
        <p className="section-label" style={{ color: "var(--seal)" }}>CERTIFIED EXECUTION RECORD</p>
        <h2
          className="italic"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.4rem", fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}
        >
          Real ALLOCATE settled on Fluxion V3
        </h2>
        <p
          className="mt-1"
          style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "11px", color: "var(--muted)" }}
        >
          Mantle mainnet · USDC→mETH→USDC round-trip · demo wallet stays solvent
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(144,126,108,0.65)", fontFamily: "'Instrument Sans', sans-serif" }}>
          Two verified Fluxion V3 swaps. Click{" "}
          <em>Run + execute on Mantle</em> above to produce a fresh pair.
        </p>
      </div>

      {/* Legs */}
      <div className="space-y-2">
        {LEGS.map((leg) => (
          <div
            key={leg.tx}
            className="rounded flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}
          >
            <span
              className="uppercase"
              style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 500, color: "rgba(144,126,108,0.4)", minWidth: 36, letterSpacing: "0.1em" }}
            >
              LEG {leg.n}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {leg.swap}
            </span>
            <span
              style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", color: "rgba(144,126,108,0.4)" }}
            >
              block {leg.block}
            </span>
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs truncate transition-opacity hover:opacity-70"
                style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--seal)", maxWidth: 300 }}
              >
                {leg.tx}
              </a>
              <CopyButton value={leg.tx} />
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs shrink-0 transition-opacity hover:opacity-70"
                style={{ color: "rgba(212,160,64,0.5)" }}
              >
                ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* RFQ note */}
      <div
        className="mt-4 rounded px-3 py-2"
        style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", background: "rgba(120,104,212,0.05)", border: "1px solid rgba(120,104,212,0.15)", color: "rgba(155,143,232,0.6)" }}
      >
        xStocks execution waits until a verified RFQ route is available.
      </div>
    </section>
  );
}
