"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { keccak256, stringToBytes } from "viem";
import { CopyButton } from "./CopyButton";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not-found" }
  | {
      kind: "found";
      receipt: {
        asset?: string;
        txHash?: string;
        reasonHash?: string;
        canonicalJson: string;
        verified?: boolean;
      };
    }
  | { kind: "error"; message: string };

interface ReceiptResponse {
  asset?: string;
  txHash?: string;
  reasonHash?: string;
  canonicalJson?: string;
  verified?: boolean;
}

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const EXPLORER_TX = "https://mantlescan.xyz/tx";

export function ReasonHashVerifier() {
  const [hash, setHash] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const normalizedHash = hash.trim();
  const validHash = HASH_RE.test(normalizedHash);

  const recomputed = useMemo(() => {
    if (state.kind !== "found") return null;
    return keccak256(stringToBytes(state.receipt.canonicalJson));
  }, [state]);

  const matches =
    state.kind === "found" && recomputed
      ? recomputed.toLowerCase() === normalizedHash.toLowerCase()
      : false;

  async function verify() {
    if (!validHash) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/receipts/${normalizedHash}`, { cache: "no-store" });
      if (res.status === 404) {
        setState({ kind: "not-found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error", message: `HTTP ${res.status}` });
        return;
      }
      const data = await res.json() as ReceiptResponse;
      if (!data.canonicalJson) {
        setState({ kind: "error", message: "Receipt returned without canonicalJson." });
        return;
      }
      setState({ kind: "found", receipt: { ...data, canonicalJson: data.canonicalJson } });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <section className="console-card console-card-compact space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--bb-teal)" }}
          >
          RECOVER RECEIPT BY REASON HASH
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
            Paste a Mantle reasonHash. Neutrino tries hosted KV/Upstash recovery, recomputes
            keccak256(canonicalJson), and checks the match.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="0x..."
          className="min-w-0 flex-1 rounded-md px-3 py-2 text-xs font-mono outline-none"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${hash && !validHash ? "rgba(232,72,85,0.35)" : "rgba(255,255,255,0.08)"}`,
            color: "var(--bb-text)",
          }}
        />
        <button
          type="button"
          disabled={!validHash || state.kind === "loading"}
          onClick={verify}
          className="rounded-md px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--bb-teal)", color: "#07100D" }}
        >
          {state.kind === "loading" ? "Checking..." : "Verify"}
        </button>
      </div>

      {hash && !validHash ? (
        <p className="text-xs" style={{ color: "var(--bb-orange)" }}>
          Enter a bytes32 hash: 0x + 64 hex characters.
        </p>
      ) : null}

      {state.kind === "not-found" ? (
        <ResultBox tone="warn" title="Receipt not found">
          Hosted receipt storage did not return canonical JSON for this reasonHash. The on-chain hash
          may still exist; recovery depends on KV/Upstash or local demo cache availability.
        </ResultBox>
      ) : null}

      {state.kind === "error" ? (
        <ResultBox tone="warn" title="Verifier error">{state.message}</ResultBox>
      ) : null}

      {state.kind === "found" ? (
        <div className="rounded-lg p-4 space-y-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--bb-text)" }}>
                Receipt found{state.receipt.asset ? ` · ${state.receipt.asset}` : ""}
              </p>
              <p className="text-xs" style={{ color: matches ? "var(--bb-teal)" : "var(--bb-red)" }}>
                matches on-chain reasonHash: {matches ? "yes" : "no"}
              </p>
            </div>
            <CopyButton value={state.receipt.canonicalJson} label="copy JSON" copiedLabel="copied" />
          </div>
          <HashLine label="input reasonHash" value={normalizedHash} />
          <HashLine label="keccak256(canonicalJson)" value={recomputed ?? "n/a"} />
          <HashLine label="canonical JSON" value={`${state.receipt.canonicalJson.length} bytes recovered`} />
          {state.receipt.txHash ? (
            <a
              href={`${EXPLORER_TX}/${state.receipt.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs font-mono transition-opacity hover:opacity-80"
              style={{ color: "var(--bb-teal)" }}
            >
              related tx {state.receipt.txHash.slice(0, 10)}...{state.receipt.txHash.slice(-6)} ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ResultBox({ title, children }: { tone: "warn"; title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg p-3 text-xs leading-relaxed"
      style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.22)", color: "var(--bb-muted)" }}
    >
      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--bb-orange)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function HashLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-xs sm:grid-cols-[170px_1fr]">
      <span className="font-mono uppercase tracking-wider" style={{ color: "rgba(138,148,166,0.55)" }}>{label}</span>
      <code className="break-all" style={{ color: "rgba(235,229,215,0.72)" }}>{value}</code>
    </div>
  );
}
