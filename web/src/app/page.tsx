import Link from "next/link";
import { RunAgentButton } from "@/components/RunAgentButton";
import { LatestExecution } from "@/components/LatestExecution";
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
  fetchRecentDecisions,
  resolveAsset,
  timeAgo,
} from "@/lib/onchain";

export const revalidate = 30;

export default function Home() {
  return (
    <div className="space-y-12 md:space-y-14">
      <Hero />
      <ScenarioSection />
      <JudgeModeGuide />
      <BuilderIntegrationSection />
      <PolicyTemplates compact />
      <LatestExecution />
      <DataHonestySection />
      <AttackSurfaceSection />
      <WhyMantleSection />
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
    <section
      className="hero-console -mx-4 -mt-10 px-4 py-12 sm:-mx-6 sm:px-6 sm:py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-7">
          <div className="space-y-4">
            <span className="section-label flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full animate-live" style={{ background: "var(--clear)" }} />
              Neutrino · AI x RWA · {NETWORK_LABEL}
            </span>
            <h1
              className="hero-title"
            >
              The market closed at 4pm.
              <br />
              <span className="hero-title-accent">The token didn&rsquo;t.</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--muted)" }}>
              Policy layer between market signals and capital movement. AI proposes, policy
              validates or overrides, Mantle verifies.
            </p>
            <div className="hero-rule">
              <span>Market signal</span>
              <span>Policy gate</span>
              <span>Mantle receipt</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#scenarios"
              className="inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--clear)", color: "#060504" }}
            >
              Run agent
            </Link>
            <Link
              href="/proof"
              className="inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-hi)", color: "var(--text)" }}
            >
              View proofs
            </Link>
            <Link
              href="/integrate"
              className="inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-hi)", color: "var(--text)" }}
            >
              Integrate
            </Link>
          </div>

          <ConsoleCard compact surface="evidence" accent="green" className="max-w-3xl">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EvidenceItem label="xStocks status" value="feed checked" tone="green" />
              <EvidenceItem label="Price quality" value="quote tagged" tone="amber" />
              <EvidenceItem label="Mantle receipts" value="on-chain" tone="green" />
              <EvidenceItem label="xStocks execution" value="RFQ gated" tone="violet" />
            </div>
          </ConsoleCard>
        </div>

        <LatestStateCard decisions={decisions} />
      </div>
    </section>
  );
}

function EvidenceItem({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "violet" }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
        {label}
      </p>
      <StatusPill value={value} tone={tone}>
        {value}
      </StatusPill>
    </div>
  );
}

function LatestStateCard({
  decisions,
}: {
  decisions: Awaited<ReturnType<typeof fetchRecentDecisions>>;
}) {
  return (
    <ConsoleCard surface="evidence" accent="gold" className="lg:sticky lg:top-20">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <span className="section-label" style={{ color: "var(--seal)" }}>
            Latest state
          </span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Current policy outcomes
          </h2>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            Latest decision per asset.
          </p>
        </div>
        <TextLink href="/proof">All proofs</TextLink>
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}>
          No decisions on-chain yet. Run a scenario below.
        </p>
      ) : (
        <ul className="space-y-3">
          {decisions.map((d) => {
            const sym = resolveAsset(d.assetAddress).symbol;
            return (
              <li key={d.txHash} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-3 py-2" style={{ background: "rgba(255,255,255,0.012)", border: "1px solid var(--border)" }}>
                <Link href={`/agent-decision/${sym}`} className="font-mono text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--text)" }}>
                  {sym}
                </Link>
                <div className="min-w-0">
                  <StatusPill value={d.action}>{d.action}</StatusPill>
                  <p className="mt-1 text-[10px]" style={{ color: "rgba(144,126,108,0.56)", fontFamily: "'Azeret Mono', monospace" }}>
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
        <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
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
        eyebrow="Agent scenarios"
        title="Run the full policy loop."
        body={
          <>
            Current signals become an AI proposal, policy review, final action, and Mantle receipt.
            Outputs are policy outcomes, not fixed asset labels.
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

      <div className="grid gap-5 lg:grid-cols-3">
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
          subtitle="Opt-in mainnet round trip"
          assets={["USDC", "mETH"]}
          description="Real Fluxion V3 USDC to mETH to USDC round trip. Two swaps, two tx hashes."
          note="xStocks execution waits for verified RFQ rails. Neutrino can record a PAUSE receipt instead of forcing an unsafe trade."
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

      <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.58)" }}>
        Transactions are signed by a controlled agent wallet. No user wallet connection is required;
        this demonstrates autonomous agent execution, not a user custody flow.
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
    <ConsoleCard surface="command" accent={tone} className="flex min-h-[340px] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
          Scenario {index}
        </span>
        <StatusPill value={subtitle} tone={tone}>
          {subtitle}
        </StatusPill>
      </div>
      <div>
        <h3 className="text-lg font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {assets.map((asset) => (
          <span key={asset} className="rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.045)", color: "rgba(242,232,213,0.78)", fontFamily: "'Azeret Mono', monospace" }}>
            {asset}
          </span>
        ))}
      </div>
      {note ? (
        <p className="rounded-md px-3 py-2 text-[11px] leading-relaxed" style={{ background: "rgba(145,136,183,0.08)", border: "1px solid rgba(145,136,183,0.18)", color: "var(--gated)", fontFamily: "'Azeret Mono', monospace" }}>
          {note}
        </p>
      ) : null}
      <div className="mt-auto">{button}</div>
    </ConsoleCard>
  );
}

function JudgeModeGuide() {
  const steps = [
    ["Market signals", "Live, stub, or n/a inputs are labelled."],
    ["AI proposal", "The model proposes a candidate action."],
    ["Policy review", "Rules approve or override before capital moves."],
    ["Mantle receipt", "reasonHash commits the canonical loop."],
    ["Optional execution", "Only verified rails can move capital."],
  ] as const;

  return (
    <section className="section-ruled space-y-5">
      <SectionHeader
        eyebrow="Judge flow"
        title="Signals are not decisions."
        body="Current signals plus policy plus AI proposal become a reviewed decision and an on-chain receipt."
      >
        <TextLink href="/proof">Open registry</TextLink>
      </SectionHeader>
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map(([title, body], index) => (
          <ConsoleCard key={title} compact surface="evidence" accent={index === 4 ? "gold" : index === 2 ? "violet" : "slate"}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.52)", fontFamily: "'Azeret Mono', monospace" }}>
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              {body}
            </p>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}

function BuilderIntegrationSection() {
  const uses = [
    ["RWA agent builders", "Add policy guardrails before execution."],
    ["Vault / treasury builders", "Prove why an agent allocated, paused, or required review."],
    ["xStocks apps", "Check market and execution conditions before capital moves."],
    ["Mantle protocols", "Generate public decision receipts for autonomous workflows."],
  ] as const;

  return (
    <section className="section-ruled space-y-5">
      <SectionHeader
        eyebrow="Use Neutrino in your agent"
        title="Builder-facing policy infrastructure."
        body="Send market context and execution intent into the policy loop, receive an AI proposal, policy review, final action, reasonHash, and Mantle receipt."
      >
        <TextLink href="/integrate">Integration guide</TextLink>
      </SectionHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {uses.map(([title, body]) => (
          <ConsoleCard key={title} compact surface="ledger" accent="slate">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {title}
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              {body}
            </p>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}

function DataHonestySection() {
  return (
    <section className="section-ruled">
      <details className="quiet-details">
        <summary>
          <div className="pr-8">
            <span className="section-label">Data transparency</span>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
              Every source is explicitly labelled.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Receipts mark signals as live, stub, modelled, or n/a.
            </p>
          </div>
        </summary>

        <div className="space-y-6 border-t p-5" style={{ borderColor: "var(--border)" }}>
          <div className="grid gap-4 lg:grid-cols-3">
            <SourcePanel
              state="LIVE"
              tone="green"
              items={[
                "xStock indicative price when the API returns a non-null quote",
                "xStock trading-halt status when endpoint responds",
                "Mantle token addresses and decision receipts",
                "US market-hours check at run time",
                "Fluxion V3 execution when explicitly selected",
              ]}
            />
            <SourcePanel
              state="MODELLED"
              tone="amber"
              items={["xStock spread / depth", "xStock 24h volume", "Order-book microstructure"]}
              note="Price is flagged live only when the public API returns a non-null quote. Spread, depth, and volume are modelled and flagged."
            />
            <SourcePanel
              state="GATED"
              tone="violet"
              items={["xStocks execution via verified issuer RFQ rails is not performed"]}
              note="Neutrino evaluates xStocks risk and can commit PAUSE on-chain when execution readiness is unavailable."
            />
          </div>

          <div>
            <p className="section-label mb-3">Verified xStock token metadata · Mantle mainnet · 2026-05-21</p>
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    {["Symbol", "Underlying", "Decimals", "Mantle address", "Source"].map((h) => (
                      <th key={h} className="text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOKEN_METADATA.map((t) => (
                    <tr key={t.symbol}>
                      <td className="font-mono font-semibold" style={{ color: "var(--text)" }}>{t.symbol}</td>
                      <td style={{ color: "var(--muted)" }}>{t.underlying}</td>
                      <td style={{ color: "var(--muted)" }}>{t.decimals}</td>
                      <td><HashText value={t.address} href={`https://mantlescan.xyz/address/${t.address}`} /></td>
                      <td style={{ color: "rgba(144,126,108,0.66)" }}>{t.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}

function SourcePanel({
  state,
  tone,
  items,
  note,
}: {
  state: string;
  tone: "green" | "amber" | "violet";
  items: string[];
  note?: string;
}) {
  return (
    <ConsoleCard compact surface="ledger" accent={tone}>
      <StatusPill value={state} tone={tone}>{state}</StatusPill>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            {item}
          </li>
        ))}
      </ul>
      {note ? (
        <p className="mt-4 rounded-md px-3 py-2 text-[11px] leading-relaxed" style={{ background: "rgba(0,0,0,0.18)", color: "rgba(242,232,213,0.62)", fontFamily: "'Azeret Mono', monospace" }}>
          {note}
        </p>
      ) : null}
    </ConsoleCard>
  );
}

const TOKEN_METADATA = [
  { symbol: "NVDAx", underlying: "NVDA · NASDAQ", decimals: 18, address: "0xc845b2894dBddd03858fd2D643B4eF725fE0849d", source: "xStocks API + on-chain" },
  { symbol: "TSLAx", underlying: "TSLA · NASDAQ", decimals: 18, address: "0x8aD3c73F833d3F9A523aB01476625F269aEB7Cf0", source: "xStocks API + on-chain" },
  { symbol: "SPYx", underlying: "SPY · NYSE", decimals: 18, address: "0x90A2a4c76b5D8c0bc892A69EA28Aa775a8f2dD48", source: "xStocks API + on-chain" },
  { symbol: "USDY", underlying: "Ondo T-bills", decimals: 18, address: "0x5bE26527e817998A7206475496fDE1E68957c5A6", source: "Mantle ERC-20" },
  { symbol: "mETH", underlying: "Mantle LST", decimals: 18, address: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0", source: "Mantle ERC-20" },
] as const;

function AttackSurfaceSection() {
  const qa = [
    {
      q: "Is the AI deciding?",
      a: "The AI scores live signals and proposes an action. Policy validates or overrides it. The final decision comes from policy and risk rules, not LLM control.",
      verdict: "No",
      tone: "green" as const,
    },
    {
      q: "Is the xStock price fake?",
      a: "Neutrino queries the xStocks public API for indicative price and trading-halt status. If the quote is null or unavailable, the receipt marks price as stub and uses a modelled fallback.",
      verdict: "Flagged",
      tone: "amber" as const,
    },
    {
      q: "Why doesn't the xStocks scenario execute a trade?",
      a: "Market context and execution readiness are evaluated separately. PAUSE means the agent refused to move capital through an unverified rail.",
      verdict: "Safety gate",
      tone: "violet" as const,
    },
    {
      q: "Is the hash verifiable?",
      a: "Yes. keccak256(canonicalJson) must equal the bytes32 reasonHash in the DecisionLogged event on Mantle.",
      verdict: "Yes",
      tone: "gold" as const,
    },
  ] as const;

  return (
    <section className="section-ruled">
      <details className="quiet-details">
        <summary>
          <div className="pr-8">
            <span className="section-label">Judge attack surface</span>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
              The skeptical questions stay visible.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Short answers for claims judges will test.
            </p>
          </div>
        </summary>
        <div className="grid gap-4 border-t p-5 md:grid-cols-2" style={{ borderColor: "var(--border)" }}>
          {qa.map(({ q, a, verdict, tone }) => (
            <ConsoleCard key={q} compact surface="ledger" accent={tone}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{q}</p>
                <StatusPill value={verdict} tone={tone}>{verdict}</StatusPill>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{a}</p>
            </ConsoleCard>
          ))}
        </div>
      </details>
    </section>
  );
}

function WhyMantleSection() {
  return (
    <section className="section-ruled space-y-6">
      <SectionHeader
        eyebrow="Why this matters for Mantle"
        title="Autonomous capital needs a policy receipt."
        body={
          <>
            Mantle has RWA rails, yield assets, and execution venues. Neutrino focuses on the layer
            before movement: trustworthy autonomous judgment.
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "AI proposes, policy validates",
            body: "The full loop is committed in the reasonHash: AI proposal, policy review, and final action.",
            tone: "blue" as const,
          },
          {
            title: "Source freshness per receipt",
            body: "Each payload labels live, stub, modelled, and n/a inputs so the decision can be inspected.",
            tone: "green" as const,
          },
          {
            title: "Verifiable by re-hash",
            body: "The byte-stable canonical JSON hashes to the bytes32 reasonHash emitted on Mantle.",
            tone: "gold" as const,
          },
        ].map((card) => (
          <ConsoleCard key={card.title} surface="ledger" accent={card.tone}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{card.title}</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{card.body}</p>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}
