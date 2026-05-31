"use client";

import { useState } from "react";
import { ConsoleCard, HashText, SectionHeader, StatusPill } from "./Console";

const EXPLORER_TX = "https://mantlescan.xyz/tx";

const LEGS = [
  {
    n: 1,
    swap: "USDC -> mETH",
    block: "95591939",
    tx: "0xbd5f817be6387c2cd052c414d9ff1f79f7e0298e926644bdfe8562d8421f2a8a",
  },
  {
    n: 2,
    swap: "mETH -> USDC demo unwind",
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
          // Clipboard availability depends on browser permissions.
        }
      }}
      className="rounded-md px-2 py-1 text-[10px] font-semibold transition-all"
      style={{
        fontFamily: "'Azeret Mono', monospace",
        background: copied ? "rgba(58,155,98,0.15)" : "rgba(255,255,255,0.045)",
        border: `1px solid ${copied ? "rgba(58,155,98,0.3)" : "var(--border)"}`,
        color: copied ? "var(--clear)" : "var(--muted)",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function LatestExecution() {
  return (
    <section className="section-ruled space-y-5">
      <SectionHeader
        eyebrow="Certified execution record"
        title="Real ALLOCATE settled on Fluxion V3."
        body="Two verified Mantle mainnet swaps from a controlled demo wallet. xStocks execution remains gated until verified RFQ rails are available."
      >
        <StatusPill value="verified" tone="green">verified</StatusPill>
      </SectionHeader>

      <ConsoleCard accent="gold" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {LEGS.map((leg) => (
            <div
              key={leg.tx}
              className="rounded-lg px-4 py-3"
              style={{ background: "rgba(0,0,0,0.18)", border: "1px solid var(--border)" }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
                    Leg {leg.n}
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {leg.swap}
                  </p>
                </div>
                <StatusPill value="settled" tone="green">settled</StatusPill>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}>
                  block {leg.block}
                </span>
                <HashText value={leg.tx} href={`${EXPLORER_TX}/${leg.tx}`} chars={10} />
                <CopyButton value={leg.tx} />
              </div>
            </div>
          ))}
        </div>

        <p className="rounded-md px-3 py-2 text-[11px] leading-relaxed" style={{ background: "rgba(120,104,212,0.08)", border: "1px solid rgba(120,104,212,0.18)", color: "#B8ACFF", fontFamily: "'Azeret Mono', monospace" }}>
          Public xStocks signals can be evaluated for risk. xStocks execution is not performed
          without a verified issuer RFQ route.
        </p>
      </ConsoleCard>
    </section>
  );
}
