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
  AGENT_ADDRESS,
  EXPLORER_ADDR,
  EXPLORER_TX,
  LOGGER_ADDRESS,
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
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
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
            <span className="hero-proof-token">ERC-8004 verified</span>
            <span style={{ color: "rgba(144,126,108,0.28)" }}>·</span>
            <span className="hero-proof-token">Verifiable on-chain receipts</span>
            <span style={{ color: "rgba(144,126,108,0.28)" }}>·</span>
            <span className="hero-proof-token">Fluxion V3 execution</span>
            <span style={{ color: "rgba(144,126,108,0.28)" }}>·</span>
            <span className="hero-proof-token">Deterministic policy engine</span>
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
  const shown = decisions.slice(0, 4);
  return (
    <ConsoleCard surface="evidence" accent="gold">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="section-label" style={{ color: "var(--seal)" }}>
          Live on Mantle
        </span>
        <TextLink href="/proof">All proofs</TextLink>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--clear) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--clear) 20%, transparent)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="var(--clear)" strokeWidth="1.25" />
              <path d="M8 5v3.5l2 1.5" stroke="var(--clear)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No decisions on-chain yet</p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>Run a scenario to write the first receipt to Mantle.</p>
          </div>
          <a href="#scenarios" className="text-[12px] font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
            Run first scenario →
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {shown.map((d) => {
              const sym = resolveAsset(d.assetAddress).symbol;
              const riskColor =
                d.riskScore >= 500 ? "var(--refuse)" :
                d.riskScore >= 250 ? "var(--pause)" :
                "var(--clear)";
              return (
                <Link
                  key={d.txHash}
                  href={`/agent-decision/${sym}`}
                  className="grid items-center gap-3 rounded px-3 py-2.5 transition-colors hover:brightness-110"
                  style={{
                    background: "rgba(255,255,255,0.018)",
                    border: "1px solid var(--border)",
                    gridTemplateColumns: "52px auto 1fr auto auto",
                  }}
                >
                  <span
                    className="font-mono text-[14px] font-bold"
                    style={{ color: "var(--text)" }}
                  >
                    {sym}
                  </span>
                  <StatusPill value={d.action} />
                  <RiskBar value={d.riskScore} label={false} />
                  <span
                    className="font-mono text-[12px] font-semibold"
                    style={{ color: riskColor, fontVariantNumeric: "tabular-nums" }}
                  >
                    {d.riskScore}
                  </span>
                  <span className="text-[11px] w-10 text-right" style={{ color: "var(--muted)" }}>
                    {timeAgo(d.timestamp)}
                  </span>
                </Link>
              );
            })}
          </div>

          {(LOGGER_ADDRESS || AGENT_ADDRESS) && (
            <div
              className="mt-4 space-y-1 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              {LOGGER_ADDRESS ? (
                <ContractRow label="Logger" address={LOGGER_ADDRESS} />
              ) : null}
              {AGENT_ADDRESS ? (
                <ContractRow label="Agent" address={AGENT_ADDRESS} />
              ) : null}
            </div>
          )}
        </>
      )}
    </ConsoleCard>
  );
}

function ContractRow({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={`${EXPLORER_ADDR}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between transition-opacity hover:opacity-70"
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "rgba(144,126,108,0.42)" }}
      >
        {label}
      </span>
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
      />

      <div className="scenario-grid grid gap-5 lg:grid-cols-3">
        <ScenarioCard
          index="01"
          tone="amber"
          title="After-hours xStock exposure"
          subtitle="Current policy outcome"
          assets={["NVDAx", "TSLAx", "SPYx"]}
          description="Checks halt status and quote availability."
          button={
            <RunAgentButton
              scenario="risky-xstocks"
              label="Run risk check"
              variant="primary"
              hint="~30-60s · 3 on-chain receipts"
            />
          }
        />
        <ScenarioCard
          index="02"
          tone="green"
          title="Safe on-chain RWA yield"
          subtitle="Current conditions"
          assets={["USDY", "mETH"]}
          description="Allocated when freshness and risk checks pass."
          button={
            <RunAgentButton
              scenario="safe-yield"
              label="Run safe-yield scenario"
              variant="primary"
              hint="~20-40s · 2 on-chain receipts"
            />
          }
        />
        <ScenarioCard
          index="03"
          tone="gold"
          title="Verified Mantle execution"
          subtitle="Live Mantle execution"
          assets={["USDC", "mETH"]}
          description="Real Fluxion V3 round trip. Two swaps, two tx hashes."
          note="xStocks execution waits for verified RFQ rails. Neutrino records a PAUSE receipt instead."
          button={
            <RunAgentButton
              scenario="safe-yield"
              executeOnChain
              label="Execute via Fluxion"
              variant="execute"
              hint="~1% fees + gas"
            />
          }
        />
      </div>
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
      body: "Market hours, prices, execution availability — each labeled.",
    },
    {
      title: "AI proposal",
      body: "LLM proposes with rationale. Never owns the decision.",
    },
    {
      title: "Policy review",
      body: "Deterministic rules validate or override. Reason on-record.",
    },
    {
      title: "Receipt",
      body: "keccak256(json) committed to Mantle. Immutable.",
    },
    {
      title: "Execution",
      body: "Capital moves only on verified rails.",
    },
  ] as const;

  return (
    <section className="section-tinted section-ruled space-y-8">
      <SectionHeader
        eyebrow="How it works"
        title="Five stages. One immutable receipt."
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
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[12px]" style={{ color: "var(--clear)" }}>
            <span className="live-dot" />
            Live
          </span>
          <TextLink href="/proof">Full registry</TextLink>
        </div>
      </SectionHeader>

      <div className="decision-feed">
        {decisions.map((d) => {
          const { symbol } = resolveAsset(d.assetAddress);
          const riskColor =
            d.riskScore >= 500 ? "var(--refuse)" :
            d.riskScore >= 250 ? "var(--pause)" :
            "var(--clear)";
          return (
            <div key={d.txHash} className="decision-feed-row">
              <Link
                href={`/agent-decision/${symbol}`}
                className="font-mono text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--text)" }}
              >
                {symbol}
              </Link>
              <StatusPill value={d.action} />
              <span
                className="decision-risk-score"
                style={{ color: riskColor }}
              >
                {d.riskScore}
                <span style={{ color: "rgba(144,126,108,0.38)", fontWeight: 400 }}>/1000</span>
              </span>
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                {timeAgo(d.timestamp)}
              </span>
              <HashText value={d.txHash} href={`${EXPLORER_TX}/${d.txHash}`} chars={7} />
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
    <section className="section-tinted section-ruled space-y-5">
      <SectionHeader
        eyebrow="Integrate"
        title="A policy check before capital moves."
        body="One call. One verified receipt on Mantle."
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
