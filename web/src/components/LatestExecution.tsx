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
      className="rounded px-2 py-0.5 text-[9px] font-medium transition-all shrink-0"
      style={{
        fontFamily: "'Azeret Mono', monospace",
        background: copied ? "rgba(61,138,98,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${copied ? "rgba(61,138,98,0.3)" : "rgba(148,180,148,0.1)"}`,
        color: copied ? "var(--sage)" : "var(--muted)",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function LatestExecution() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--sage)",
        borderRadius: "0 10px 10px 0",
        padding: "24px",
      }}
    >
      {/* Corner mark */}
      <div
        className="absolute pointer-events-none"
        style={{ top: 8, right: 8, width: 10, height: 10, borderTop: "1px solid var(--border-hi)", borderRight: "1px solid var(--border-hi)" }}
      />

      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[9px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--sage)" }}
        >
          CERTIFIED EXECUTION RECORD
        </p>
        {/* Fraunces italic for key headline */}
        <h2
          className="text-xl italic"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--text)", fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          Real ALLOCATE settled on Fluxion V3
        </h2>
        <p
          className="mt-1 text-xs"
          style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--muted)" }}
        >
          Mantle mainnet · USDC→mETH→USDC round-trip · demo wallet stays solvent
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(122,146,130,0.7)" }}>
          Two verified Fluxion V3 swaps. Click{" "}
          <em>Run + execute on Mantle</em> above to produce a fresh pair.
        </p>
      </div>

      {/* Exhibit legs */}
      <div className="space-y-2">
        {LEGS.map((leg) => (
          <div
            key={leg.tx}
            className="rounded flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}
          >
            <span
              className="text-[9px] font-mono font-medium uppercase"
              style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(122,146,130,0.4)", minWidth: 36 }}
            >
              LEG {leg.n}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--text)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {leg.swap}
            </span>
            <span className="text-[10px]" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(122,146,130,0.4)" }}>
              block {leg.block}
            </span>
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs truncate transition-opacity hover:opacity-70"
                style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--sage)", maxWidth: 320 }}
              >
                {leg.tx}
              </a>
              <CopyButton value={leg.tx} />
              <a
                href={`${EXPLORER_TX}/${leg.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs shrink-0 transition-opacity hover:opacity-70"
                style={{ color: "rgba(61,138,98,0.5)" }}
              >
                ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note — RFQ */}
      <div
        className="mt-4 rounded px-3 py-2 text-[10px]"
        style={{ fontFamily: "'Azeret Mono', monospace", background: "rgba(124,92,252,0.05)", border: "1px solid rgba(124,92,252,0.15)", color: "rgba(157,132,255,0.6)" }}
      >
        xChange / Atomic RFQ not executed — institutional channel requiring API key + registered wallet
      </div>
    </section>
  );
}
