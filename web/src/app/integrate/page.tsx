import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PolicyTemplates } from "@/components/PolicyTemplates";
import {
  ConsoleCard,
  HashText,
  MetricStrip,
  SectionHeader,
  StatusPill,
  TextLink,
} from "@/components/Console";
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

const CURL_SAFE_YIELD = `curl -X POST https://neutrino-fawn.vercel.app/api/run-agent \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"safe-yield","execute":false}'`;

const CURL_XSTOCKS = `curl -X POST https://neutrino-fawn.vercel.app/api/run-agent \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"risky-xstocks","execute":false}'`;

const FETCH_SNIPPET = `const res = await fetch("/api/run-agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenario: "safe-yield",
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

export default function IntegratePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <div>
              <span className="section-label">Builder integration</span>
              <h1
                className="leading-tight"
                style={{
                  color: "var(--text)",
                  fontFamily: "'Instrument Sans', system-ui, sans-serif",
                  fontSize: "clamp(2rem, 4.2vw, 3.25rem)",
                  fontWeight: 600,
                  letterSpacing: "0",
                }}
              >
                Use Neutrino in your agent.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Send market context and execution intent. Receive proposal, policy review,
                final action, reasonHash, and Mantle receipt.
              </p>
            </div>

            <MetricStrip
              columns={3}
              items={[
                { label: "Network", value: NETWORK_LABEL, tone: "green" },
                { label: "Endpoint", value: "/api/run-agent", tone: "blue" },
                { label: "Receipts", value: "reasonHash keyed", tone: "gold" },
              ]}
            />
          </div>

          <ConsoleCard accent="gold" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="section-label mb-0" style={{ color: "var(--seal)" }}>
                Live surfaces
              </span>
              <StatusPill value="mainnet" tone="green">mainnet</StatusPill>
            </div>
            <div className="grid gap-2 text-sm">
              <Link href="/proof" className="transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
                Live proof registry
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
                GitHub repo
              </a>
              <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
                Demo video
              </a>
              <a href={`${EXPLORER_TX}/${EXAMPLE_TX}`} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
                Example Mantlescan tx
              </a>
            </div>
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <ContractLink label="RWADecisionLogger" address={LOGGER_ADDRESS} />
              <ContractLink label="RWAAgent" address={AGENT_ADDRESS} />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(144,126,108,0.64)", fontFamily: "'Azeret Mono', monospace" }}>
              AI inference is off-chain. Mantle stores the final receipt commitment.
            </p>
          </ConsoleCard>
        </div>
      </section>

      <section className="section-ruled space-y-5">
        <SectionHeader
          eyebrow="Quickstart"
          title="Run a receipt-only policy evaluation."
          body="Real hosted endpoint. Receipt-only. No capital movement."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <CodePanel title="Safe-yield receipt run" code={CURL_SAFE_YIELD} copy />
          <CodePanel title="xStocks receipt-only run" code={CURL_XSTOCKS} copy />
        </div>
      </section>

      <section className="section-ruled grid gap-5 lg:grid-cols-2">
        <CodePanel title="Fetch example" code={FETCH_SNIPPET} copy />
        <CodePanel title="Example response shape" code={RESPONSE_SNIPPET} />
      </section>

      <section className="section-ruled space-y-5">
        <SectionHeader
          eyebrow="Flow"
          title="AI proposal -> policy review -> on-chain receipt."
          body="Optional execution requires both policy approval and a verified rail."
        />
        <div className="grid gap-3 md:grid-cols-5">
          {[
            "market signals",
            "AI proposal",
            "policy review",
            "final receipt",
            "optional execution",
          ].map((step, index) => (
            <ConsoleCard key={step} compact accent={index === 4 ? "gold" : "slate"}>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.56)", fontFamily: "'Azeret Mono', monospace" }}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {step}
              </p>
            </ConsoleCard>
          ))}
        </div>
      </section>

      <PolicyTemplates />

      <section className="section-ruled space-y-5">
        <SectionHeader
          eyebrow="Who uses Neutrino?"
          title="Infrastructure for agents that need a reason before action."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UseCase title="RWA agent builders" body="Add policy guardrails before execution." />
          <UseCase title="Vault / treasury builders" body="Prove why an agent allocated, paused, or required review." />
          <UseCase title="xStocks apps" body="Check market and execution conditions before capital moves." />
          <UseCase title="Mantle protocols" body="Generate public decision receipts for autonomous workflows." />
        </div>
        <TextLink href="/proof">Open the live proof registry</TextLink>
      </section>
    </div>
  );
}

function CodePanel({ title, code, copy = false }: { title: string; code: string; copy?: boolean }) {
  return (
    <ConsoleCard accent="slate" compact className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--seal)" }}>
          {title}
        </p>
        {copy ? <CopyButton value={code} label="copy" copiedLabel="copied" /> : null}
      </div>
      <pre className="console-code">
        <code>{code}</code>
      </pre>
    </ConsoleCard>
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
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
        {label}
      </span>
      <HashText value={address} chars={8} />
    </a>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <ConsoleCard compact accent="slate">
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        {body}
      </p>
    </ConsoleCard>
  );
}
