"use client";

import { useState } from "react";

/**
 * Static record of the most recent end-to-end on-chain execution, verified on
 * Mantlescan. These are real historical transactions — not a live feed — so the
 * block is labelled "verified" rather than presented as live state. Refresh the
 * hashes here after a notable run; /proof shows the live decision feed.
 */
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
          // Clipboard unavailable — the hash is still selectable inline.
        }
      }}
      className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function LatestExecution() {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
        Latest verified on-chain execution
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
        A real ALLOCATE settled on Fluxion V3 — Mantle mainnet
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
        Two real Fluxion V3 swaps signed by the agent runner wallet. The demo
        runs a round-trip (USDC → mETH → USDC) so the shared wallet stays
        solvent for every judge — in production the agent holds the mETH
        position. Both transaction hashes are live on Mantlescan; click{" "}
        <em>Run + execute on Mantle</em> above to produce a fresh pair.
      </p>
      <ul className="mt-4 space-y-2">
        {LEGS.map((leg) => (
          <li
            key={leg.tx}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
          >
            <span className="text-xs font-medium text-zinc-500">
              Leg {leg.n}
            </span>
            <span className="font-medium text-zinc-900">{leg.swap}</span>
            <span className="text-[10px] text-zinc-400">block {leg.block}</span>
            <a
              href={`${EXPLORER_TX}/${leg.tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
            >
              {leg.tx}
            </a>
            <CopyButton value={leg.tx} />
          </li>
        ))}
      </ul>
    </section>
  );
}
