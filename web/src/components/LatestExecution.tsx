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
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded px-2 py-0.5 text-[10px] font-mono font-medium transition-all"
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

export function LatestExecution() {
  return (
    <section
      className="rounded-xl p-6 space-y-5"
      style={{ background: "rgba(45,212,165,0.04)", border: "1px solid rgba(45,212,165,0.2)" }}
    >
      {/* Header */}
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
        >
          LATEST VERIFIED ON-CHAIN EXECUTION
        </p>
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Real ALLOCATE settled on Fluxion V3 — Mantle mainnet
        </h2>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
          Two real Fluxion V3 swaps. Demo round-trip (USDC→mETH→USDC) keeps the shared
          wallet solvent — in production the agent holds the mETH position.
          Click <em>Run + execute on Mantle</em> above to produce a fresh pair.
        </p>
      </div>

      {/* Legs */}
      <div className="space-y-2">
        {LEGS.map((leg) => (
          <div
            key={leg.tx}
            className="rounded-lg flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            style={{ background: "var(--bb-panel)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span
              className="text-[10px] font-mono font-medium uppercase"
              style={{ color: "rgba(138,148,166,0.5)", minWidth: 36 }}
            >
              LEG {leg.n}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {leg.swap}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: "rgba(138,148,166,0.4)" }}
            >
              block {leg.block}
            </span>
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs truncate"
                style={{ color: "var(--bb-teal)", maxWidth: 340 }}
              >
                {leg.tx}
              </a>
              <CopyButton value={leg.tx} />
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono shrink-0"
                style={{ color: "rgba(45,212,165,0.5)" }}
              >
                ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="rounded px-3 py-2 text-[11px]"
        style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(138,148,166,0.5)" }}
      >
        xChange / Atomic RFQ not executed — institutional channel requiring API key + registered wallet
      </div>
    </section>
  );
}
