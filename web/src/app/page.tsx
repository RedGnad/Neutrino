import Link from "next/link";
import { RunAgentButton } from "@/components/RunAgentButton";
import { PolicyTemplates } from "@/components/PolicyTemplates";
import {
  ConsoleCard,
  HashText,
  RiskBar,
  SectionHeader,
  StatusPill,
  TextLink,
} from "@/components/Console";
import {
  NETWORK_LABEL,
  LOGGER_ADDRESS,
  AGENT_ADDRESS,
  EXPLORER_ADDR,
  EXPLORER_TX,
  fetchRecentDecisions,
  resolveAsset,
  timeAgo,
} from "@/lib/onchain";

export const revalidate = 30;

export default function Home() {
  return (
    <div className="space-y-20 md:space-y-24">
      <Hero />
      <ScenarioSection />
      <JudgeModeGuide />
      <RecentDecisions />
      <BuilderIntegrationSection />
      <PolicyTemplates compact />
    </div>
  );
}

async function Hero() {
  const allDecisions = await fetchRecentDecisions(100).catch(() => []);
  const seenSymbols = new Set<string>();
  const decisions = allDecisions
    .filter((d) => {
      const sym = resolveAsset(d.assetAddress).symbol;
      if (seenSymbols.has(sym)) return false;
      seenSymbols.add(sym);
      return true;
    })
    .slice(0, 5);

  return (
    <section className="hero-console -mt-10 px-4 pt-12 pb-24 sm:px-6 sm:pt-14 sm:pb-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-5">
            <span className="section-label flex items-center gap-2 animate-stagger-1">
              <span
                className="h-1.5 w-1.5 rounded-full animate-live"
                style={{ background: "var(--clear)" }}
              />
              Live on Mantle Mainnet
            </span>
            <h1 className="hero-title animate-stagger-2">
              The market closed at 4pm.
              <br />
              <span className="hero-title-accent">The token didn&rsquo;t.</span>
            </h1>
            <p
              className="text-lg leading-relaxed sm:text-xl animate-stagger-3"
              style={{ color: "var(--muted)", maxWidth: "44ch" }}
            >
              Tokenized stocks trade 24/7. Their underlying markets don&rsquo;t.
              Every autonomous decision scored, validated against policy, and
              committed to Mantle before capital moves.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 animate-stagger-4">
            <Link
              href="#scenarios"
              className="console-action inline-flex h-12 items-center rounded-md px-8 text-[15px] font-semibold"
              style={{ background: "var(--clear)", color: "#060504" }}
            >
              Run agent
            </Link>
            <Link
              href="/proof"
              className="console-action inline-flex h-12 items-center rounded-md px-6 text-[15px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-hi)",
                color: "var(--text)",
              }}
            >
              View proofs
            </Link>
            <Link
              href="/integrate"
              className="console-action inline-flex h-12 items-center rounded-md px-6 text-[15px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-hi)",
                color: "var(--text)",
              }}
            >
              Integrate
            </Link>
          </div>

          <div className="hero-proof-strip animate-stagger-5">
            <span className="hero-proof-token">Live on Mantle mainnet</span>
            <span className="hero-proof-token">ERC-8004 verified</span>
            <span className="hero-proof-token">Verifiable on-chain receipts</span>
            <span className="hero-proof-token">Fluxion V3 execution</span>
          </div>
        </div>

        <div style={{ filter: "drop-shadow(0 24px 56px rgba(0,0,0,0.6))" }}>
          <LatestStateCard decisions={decisions} />
        </div>
      </div>
    </section>
  );
}

function LatestStateCard({
  decisions,
}: {
  decisions: Awaited<ReturnType<typeof fetchRecentDecisions>>;
}) {
  return (
    <ConsoleCard
      surface="evidence"
      accent="gold"
      className="lg:sticky lg:top-20"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <span className="section-label" style={{ color: "var(--seal)" }}>
            Latest state
          </span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Current policy outcomes
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Latest decision per asset.
          </p>
        </div>
        <TextLink href="/proof">All proofs</TextLink>
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No decisions on-chain yet. Run a scenario below.
        </p>
      ) : (
        <ul className="space-y-3">
          {decisions.map((d) => {
            const sym = resolveAsset(d.assetAddress).symbol;
            return (
              <li
                key={d.txHash}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.012)",
                  border: "1px solid var(--border)",
                }}
              >
                <Link
                  href={`/agent-decision/${sym}`}
                  className="font-mono text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ color: "var(--text)" }}
                >
                  {sym}
                </Link>
                <div className="min-w-0">
                  <StatusPill value={d.action}>{d.action}</StatusPill>
                  <p className="mt-1 text-[11px]" style={{ color: "rgba(144,126,108,0.58)" }}>
                    {timeAgo(d.timestamp)}
                  </p>
                </div>
                <RiskBar value={d.riskScore} label={false} />
              </li>
            );
          })}
        </ul>
      )}

      {(LOGGER_ADDRESS || AGENT_ADDRESS) && (
        <div
          className="mt-5 space-y-2 border-t pt-4"
          style={{ borderColor: "var(--border)" }}
        >
          {LOGGER_ADDRESS ? (
            <ContractLink label="Logger" address={LOGGER_ADDRESS} />
          ) : null}
          {AGENT_ADDRESS ? (
            <ContractLink label="Agent" address={AGENT_ADDRESS} />
          ) : null}
        </div>
      )}
    </ConsoleCard>
  );
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={`${EXPLORER_ADDR}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 text-[10px] transition-opacity hover:opacity-80"
      style={{ color: "rgba(144,126,108,0.62)", fontFamily: "'Azeret Mono', monospace" }}
    >
      <span>{label}</span>
      <HashText value={address} chars={8} />
    </a>
  );
}

function ScenarioSection() {
  return (
    <section id="scenarios" className="section-ruled scroll-mt-24 space-y-6">
      <SectionHeader
        eyebrow="Try it live"
        title="Run the full policy loop."
        body={
          <>
            Current signals become an AI proposal, policy review, and a Mantle
            receipt. Every output is a policy decision, not a fixed asset label.
          </>
        }
      />

      <ConsoleCard compact surface="evidence" accent="violet">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <StatusPill value="AI proposal" tone="blue">AI proposal</StatusPill>
            <span style={{ color: "var(--muted)" }}>scores signals</span>
          </span>
          <span className="flex items-center gap-2">
            <StatusPill value="Policy review" tone="violet">Policy review</StatusPill>
            <span style={{ color: "var(--muted)" }}>validates before receipt</span>
          </span>
        </div>
      </ConsoleCard>

      <div className="scenario-grid grid gap-5 lg:grid-cols-3">
        <ScenarioCard
          index="01"
          tone="amber"
          title="After-hours xStock exposure"
          subtitle="Current policy outcome"
          assets={["NVDAx", "TSLAx", "SPYx"]}
          description="Checks halt status and quote availability. PAUSE can come from market context, stale quote, or unavailable execution rail."
          button={
            <RunAgentButton
              scenario="risky-xstocks"
              label="Run risk check"
              variant="primary"
              hint="Risk evaluation only · ~30-60s · 3 on-chain receipts"
            />
          }
        />
        <ScenarioCard
          index="02"
          tone="green"
          title="Safe on-chain RWA yield"
          subtitle="Policy outcome under current conditions"
          assets={["USDY", "mETH"]}
          description="USDY and mETH can be allocated when freshness and risk checks pass. xStock signals are n/a."
          button={
            <RunAgentButton
              scenario="safe-yield"
              label="Run safe-yield scenario"
              variant="primary"
              hint="Risk evaluation · ~20-40s · 2 on-chain receipts"
            />
          }
        />
        <ScenarioCard
          index="03"
          tone="gold"
          title="Verified Mantle execution"
          subtitle="Live Mantle execution"
          assets={["USDC", "mETH"]}
          description="Real Fluxion V3 USDC to mETH to USDC round trip. Two swaps, two tx hashes."
          note="xStocks execution waits for verified RFQ rails. Neutrino records a PAUSE receipt instead of forcing an unsafe trade."
          button={
            <RunAgentButton
              scenario="safe-yield"
              executeOnChain
              label="Execute via Fluxion"
              variant="execute"
              hint="Decisions + real Fluxion round-trip · ~1% fees + gas"
            />
          }
        />
      </div>

      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(144,126,108,0.54)" }}>
        Transactions are signed by a controlled agent wallet. No user wallet
        connection is required — this demonstrates autonomous agent execution,
        not a user custody flow.
      </p>
    </section>
  );
}

function ScenarioCard({
  index,
  tone,
  title,
  subtitle,
  assets,
  description,
  note,
  button,
}: {
  index: string;
  tone: "green" | "amber" | "gold";
  title: string;
  subtitle: string;
  assets: string[];
  description: string;
  note?: string;
  button: React.ReactNode;
}) {
  return (
    <ConsoleCard
      surface="command"
      accent={tone}
      interactive
      className="scenario-card"
    >
      <div className="scenario-card-head">
        <span className="scenario-card-index">Scenario {index}</span>
        <StatusPill
          value={subtitle}
          tone={tone}
          className="scenario-card-status"
        >
          {subtitle}
        </StatusPill>
      </div>
      <div className="scenario-card-body">
        <h3 className="text-xl font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
      <div className="scenario-card-tags flex flex-wrap gap-1.5">
        {assets.map((asset) => (
          <span key={asset} className="scenario-chip">{asset}</span>
        ))}
      </div>
      {note ? <p className="scenario-card-note">{note}</p> : null}
      <div className="scenario-card-action">{button}</div>
    </ConsoleCard>
  );
}

function JudgeModeGuide() {
  const steps = [
    {
      title: "Signals",
      body: "Market hours, xStocks price and halt status, and execution availability — all labeled live, stub, or n/a.",
    },
    {
      title: "AI proposal",
      body: "LLM suggests an action and rationale. Confidence attached. The LLM never owns the final decision.",
    },
    {
      title: "Policy review",
      body: "Deterministic rules validate or override the AI proposal. Override reason is explicit and on-record.",
    },
    {
      title: "Receipt",
      body: "keccak256(canonicalJson) committed to Mantle as reasonHash. Immutable, re-hashable by anyone.",
    },
    {
      title: "Execution",
      body: "Capital moves only on verified rails — Fluxion V3 for mETH, INIT Capital for stable yield.",
    },
  ] as const;

  return (
    <section className="section-ruled space-y-8">
      <SectionHeader
        eyebrow="How it works"
        title="Five stages. One immutable receipt."
        body="Every run produces a canonical decision JSON, a reasonHash committed to Mantle, and a verifiable proof trail — from raw signals to on-chain action."
      >
        <TextLink href="/proof">Open registry</TextLink>
      </SectionHeader>
      <div className="judge-flow-track">
        {steps.map(({ title, body }, index) => (
          <div key={title} className="judge-flow-step">
            <div className="judge-flow-num">{index + 1}</div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {title}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function RecentDecisions() {
  const decisions = await fetchRecentDecisions(6).catch(() => []);
  if (decisions.length === 0) return null;

  return (
    <section className="section-ruled space-y-6">
      <SectionHeader
        eyebrow="Live activity"
        title="Recent decisions."
        body="Every action scored, reviewed, and committed on-chain. Verifiable by anyone."
      >
        <TextLink href="/proof">Full registry</TextLink>
      </SectionHeader>

      <div style={{ border: "1px solid var(--border)", borderRadius: "2px" }}>
        {decisions.map((d, i) => {
          const { symbol } = resolveAsset(d.assetAddress);
          return (
            <div
              key={d.txHash}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
              style={{
                borderBottom: i < decisions.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <Link
                href={`/agent-decision/${symbol}`}
                className="w-14 font-mono text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--text)" }}
              >
                {symbol}
              </Link>
              <StatusPill value={d.action} />
              <div className="hidden min-w-[96px] sm:block">
                <RiskBar value={d.riskScore} />
              </div>
              <span
                className="text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                {timeAgo(d.timestamp)}
              </span>
              <span className="ml-auto">
                <HashText value={d.txHash} href={`${EXPLORER_TX}/${d.txHash}`} chars={8} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BuilderIntegrationSection() {
  const uses = [
    ["RWA agents", "Policy guardrails before every execution.", "guardrail"],
    ["Treasuries", "Auditable allocation rationale.", "proof"],
    ["xStocks apps", "Market and execution checks before capital moves.", "gate"],
    ["Mantle protocols", "Public decision receipts for autonomous workflows.", "receipt"],
  ] as const;

  return (
    <section className="section-ruled space-y-5">
      <SectionHeader
        eyebrow="Integrate"
        title="A policy check before capital moves."
        body="Send intent in. Get proposal, review, final action, reasonHash, and receipt."
      >
        <TextLink href="/integrate">Integration guide</TextLink>
      </SectionHeader>
      <div className="landing-brief-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {uses.map(([title, body, label]) => (
          <ConsoleCard
            key={title}
            compact
            surface="ledger"
            accent="slate"
            interactive
            className="landing-brief-card"
          >
            <StatusPill value={label} tone="slate">{label}</StatusPill>
            <p className="landing-card-title">{title}</p>
            <p className="landing-card-copy">{body}</p>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}
