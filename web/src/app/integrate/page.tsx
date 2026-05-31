import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PolicyTemplates } from "@/components/PolicyTemplates";
import {
  AGENT_ADDRESS,
  EXPLORER_ADDR,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  NETWORK_LABEL,
} from "@/lib/onchain";

export const revalidate = 60;

const GITHUB_URL = "https://github.com/RedGnad/Neutrino";
const DEMO_VIDEO_URL = "https://youtube.com/watch?v=mKJ9H6le5xY";
const EXAMPLE_TX =
  "0xa09b1576df102dbf2a062b72ca6097907a37b2c362e954de5bca4dd0e7ef51d8";

const FETCH_SNIPPET = `const res = await fetch("/api/run-agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenario: "default",
    execute: false
  })
});

const run = await res.json();
const decision = run.results[0];`;

const RESPONSE_SNIPPET = `{
  "asset": "TSLAx",
  "aiProposal": {
    "proposedAction": "REVIEW",
    "confidence": 0.55,
    "model": "claude-haiku-4-5"
  },
  "policyReview": {
    "decision": "OVERRIDE",
    "finalAction": "PAUSE",
    "reason": "Execution conditions unsafe under current policy"
  },
  "onchainCommitment": {
    "reasonHash": "0x...",
    "txHash": "0x..."
  }
}`;

const CURL_SAFE_YIELD = `curl -X POST https://neutrino-fawn.vercel.app/api/run-agent \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"safe-yield","execute":false}'`;

const CURL_XSTOCKS = `curl -X POST https://neutrino-fawn.vercel.app/api/run-agent \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"risky-xstocks","execute":false}'`;

export default function IntegratePage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <div>
            <span className="section-label">BUILDER INTEGRATION</span>
            <h1
              className="italic leading-tight"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              Use Neutrino in your agent.
            </h1>
            <p
              className="mt-4 max-w-2xl text-base leading-relaxed"
              style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              Neutrino is a policy layer for RWA agents. The hosted demo endpoint runs
              named scenarios through the live policy loop and returns an AI proposal,
              policy review, final action, reasonHash, and Mantle receipt.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-5">
            {[
              "market signals",
              "AI proposal",
              "policy review",
              "final on-chain receipt",
              "optional execution if allowed",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="mb-2 text-[10px] font-medium uppercase tracking-widest"
                  style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.5)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p
                  className="text-sm font-semibold leading-snug"
                  style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}
          >
            market signals → AI proposal → policy review → on-chain receipt → optional execution
            if allowed
          </p>
        </div>

        <aside
          className="rounded-lg p-5 space-y-4"
          style={{ background: "var(--panel)", border: "1px solid var(--border-hi)" }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--seal)" }}
          >
            Live surfaces
          </p>
          <div className="space-y-2 text-sm">
            <Link href="/proof" className="block transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
              Live proof registry
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
              GitHub repo
            </a>
            <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
              Demo video
            </a>
            <a href={`${EXPLORER_TX}/${EXAMPLE_TX}`} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
              Example Mantlescan tx
            </a>
          </div>
          <div
            className="space-y-2 rounded p-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
          >
            <ContractLink label="RWADecisionLogger" address={LOGGER_ADDRESS} />
            <ContractLink label="RWAAgent" address={AGENT_ADDRESS} />
          </div>
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: "rgba(144,126,108,0.55)", fontFamily: "'Azeret Mono', monospace" }}
          >
            Current network: {NETWORK_LABEL}. AI inference is off-chain; Mantle stores the final
            decision receipt commitment.
          </p>
        </aside>
      </section>

      <section className="section-ruled grid gap-5 lg:grid-cols-2">
        <CodePanel title="Fetch example" code={FETCH_SNIPPET} copy />
        <CodePanel title="Example response shape" code={RESPONSE_SNIPPET} />
      </section>

      <section className="section-ruled space-y-4">
        <div>
          <span className="section-label">COPYABLE CURL</span>
          <p
            className="mt-1 max-w-2xl text-sm leading-relaxed"
            style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
          >
            Receipt-only commands against the real hosted endpoint. They do not execute capital movement.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <CodePanel title="Safe-yield receipt run" code={CURL_SAFE_YIELD} copy />
          <CodePanel title="xStocks receipt-only run" code={CURL_XSTOCKS} copy />
        </div>
      </section>

      <PolicyTemplates />

      <section className="section-ruled space-y-5">
        <div>
          <span className="section-label">WHO USES NEUTRINO?</span>
          <h2
            className="italic"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1.75rem",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            Infrastructure for agents that need a reason before action.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UseCase title="RWA agent builders" body="Add policy guardrails before execution." />
          <UseCase title="Vault / treasury builders" body="Prove why an agent allocated, paused, or required review." />
          <UseCase title="xStocks apps" body="Check market and execution conditions before capital moves." />
          <UseCase title="Mantle protocols" body="Generate public decision receipts for autonomous workflows." />
        </div>
      </section>
    </div>
  );
}

function CodePanel({ title, code, copy = false }: { title: string; code: string; copy?: boolean }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--panel)", border: "1px solid var(--border-hi)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--seal)" }}
        >
          {title}
        </p>
        {copy ? <CopyButton value={code} label="copy" copiedLabel="copied" /> : null}
      </div>
      <pre
        className="overflow-x-auto rounded p-4 text-[11px] leading-relaxed"
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid var(--border)",
          color: "rgba(242,232,213,0.78)",
          fontFamily: "'Azeret Mono', monospace",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={`${EXPLORER_ADDR}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 transition-opacity hover:opacity-80"
    >
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(144,126,108,0.5)", fontFamily: "'Azeret Mono', monospace" }}
      >
        {label}
      </span>
      <span
        className="font-mono text-[11px]"
        style={{ color: "var(--muted)" }}
      >
        {address.slice(0, 8)}...{address.slice(-6)}
      </span>
    </a>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
    >
      <p
        className="mb-2 text-sm font-semibold"
        style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
      >
        {title}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
      >
        {body}
      </p>
    </div>
  );
}
