import Link from "next/link";
import { RunAgentButton } from "@/components/RunAgentButton";
import { LatestExecution } from "@/components/LatestExecution";
import { DecisionTimeline } from "@/components/DecisionTimeline";
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
    <div className="space-y-14">
      <Hero />
      <JudgeModeGuide />
      <LatestExecution />
      <DecisionTimeline />
      <ScenarioSection />
      <DataHonestySection />
      <AttackSurfaceSection />
      <WhyMantleSection />
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

async function Hero() {
  const allDecisions = await fetchRecentDecisions(100).catch(() => []);
  // Deduplicate by canonical symbol (not address) — each asset has both a legacy
  // placeholder address and a real Mantle address; keying by address lets both through.
  const seenSymbols = new Set<string>();
  const decisions = allDecisions.filter((d) => {
    const sym = resolveAsset(d.assetAddress).symbol;
    if (seenSymbols.has(sym)) return false;
    seenSymbols.add(sym);
    return true;
  });

  return (
    <section
      className="-mx-6 -mt-10 px-6 pt-16 pb-16"
      style={{
        background:
          "linear-gradient(175deg, var(--bg) 0%, var(--panel) 100%)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-[1fr_320px] items-start">

          {/* LEFT — Headline */}
          <div className="space-y-8">
            <div className="animate-stagger-1">
              <span className="section-label flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-live"
                  style={{ background: "var(--clear)" }}
                />
                Neutrino · AI × RWA · {NETWORK_LABEL}
              </span>
            </div>

            <div className="animate-stagger-2">
              <h1
                className="italic leading-[1.05] tracking-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(3rem, 6.5vw, 5rem)",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                The market
                <br />
                closed at 4pm.
                <br />
                <span style={{ color: "var(--muted)" }}>
                  The token
                  <br />
                  didn&rsquo;t.
                </span>
              </h1>
            </div>

            <div className="animate-stagger-3 max-w-lg">
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
              >
                Neutrino reads live xStocks signals, scores risk with
                deterministic rules, writes a verifiable receipt on Mantle,
                and executes only through a verified rail.{" "}
                <span style={{ color: "var(--text)" }}>
                  The engine decides. The LLM explains.
                </span>
              </p>
            </div>

            <div className="animate-stagger-4 flex flex-wrap gap-2">
              <ProofChip label="xStocks price + status" state="LIVE" color="clear" />
              <ProofChip label="Mantle receipts" state="LIVE" color="clear" />
              <ProofChip label="Fluxion execution" state="LIVE" color="clear" />
              <ProofChip label="xChange RFQ" state="AUTH GATED" color="gated" />
            </div>

            <div className="animate-stagger-5 flex flex-wrap gap-3">
              <Link
                href="#scenarios"
                className="inline-flex h-10 items-center rounded px-5 text-sm font-semibold transition-all"
                style={{
                  background: "var(--clear)",
                  color: "#060504",
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                Run the agent
              </Link>
              <Link
                href="/proof"
                className="inline-flex h-10 items-center rounded px-5 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(200,168,110,0.06)",
                  color: "var(--text)",
                  border: "1px solid var(--border-hi)",
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                On-chain proofs
              </Link>
            </div>

            {(LOGGER_ADDRESS || AGENT_ADDRESS) && (
              <div
                className="flex flex-wrap gap-4 pt-1"
                style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px" }}
              >
                {LOGGER_ADDRESS && (
                  <a
                    href={`${EXPLORER_ADDR}/${LOGGER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                    style={{ color: "rgba(144,126,108,0.5)" }}
                  >
                    RWADecisionLogger:{" "}
                    <span style={{ color: "var(--muted)" }}>
                      {LOGGER_ADDRESS.slice(0, 10)}…{LOGGER_ADDRESS.slice(-6)}
                    </span>
                    <span style={{ color: "var(--seal)" }}>↗</span>
                  </a>
                )}
                {AGENT_ADDRESS && (
                  <a
                    href={`${EXPLORER_ADDR}/${AGENT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
                    style={{ color: "rgba(144,126,108,0.5)" }}
                  >
                    RWAAgent:{" "}
                    <span style={{ color: "var(--muted)" }}>
                      {AGENT_ADDRESS.slice(0, 10)}…{AGENT_ADDRESS.slice(-6)}
                    </span>
                    <span style={{ color: "var(--seal)" }}>↗</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Live decisions column */}
          <div
            className="animate-stagger-3"
            style={{
              borderLeft: "1px solid var(--border-hi)",
              paddingLeft: "28px",
            }}
          >
            <p className="section-label mb-4">LATEST STATE · LIVE</p>

            {decisions.length === 0 ? (
              <p
                className="text-sm"
                style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--muted)" }}
              >
                No decisions on-chain yet — run a scenario below.
              </p>
            ) : (
              <ul className="space-y-0">
                {decisions.map((d, i) => {
                  const sym = resolveAsset(d.assetAddress).symbol;
                  const isPause = d.action === "PAUSE" || d.action === "REDUCE";
                  const isAllocate = d.action === "ALLOCATE";
                  const actionColor = isPause
                    ? "var(--refuse)"
                    : isAllocate
                    ? "var(--clear)"
                    : "var(--seal)";

                  return (
                    <li
                      key={d.txHash}
                      className="flex items-baseline gap-3 py-2.5"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animation: `stagger-up 0.4s ease-out ${i * 60}ms both`,
                      }}
                    >
                      <span
                        className="font-semibold text-sm shrink-0 w-12"
                        style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--text)" }}
                      >
                        {sym}
                      </span>
                      <span
                        className="text-xs font-medium flex-1"
                        style={{ fontFamily: "'Azeret Mono', monospace", color: actionColor }}
                      >
                        {d.action}
                      </span>
                      <span
                        className="text-[10px] shrink-0"
                        style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.5)" }}
                      >
                        {timeAgo(d.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div
              className="mt-4 flex items-center justify-between"
              style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px" }}
            >
              <span style={{ color: "rgba(144,126,108,0.4)" }}>
                5 assets · latest decision per asset · Mantle Mainnet
              </span>
              <Link
                href="/proof"
                className="transition-opacity hover:opacity-70"
                style={{ color: "var(--seal)" }}
              >
                all proofs ↗
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function ProofChip({
  label,
  state,
  color,
}: {
  label: string;
  state: string;
  color: "clear" | "seal" | "gated" | "muted";
}) {
  const s = {
    clear: { bg: "rgba(58,155,98,0.08)",  border: "rgba(58,155,98,0.22)",  dot: "var(--clear)", text: "var(--clear)" },
    seal:  { bg: "rgba(212,160,64,0.08)", border: "rgba(212,160,64,0.22)", dot: "var(--seal)",  text: "var(--seal)" },
    gated: { bg: "rgba(120,104,212,0.08)",border: "rgba(120,104,212,0.22)",dot: "var(--gated)", text: "#9B8FE8" },
    muted: { bg: "rgba(144,126,108,0.06)",border: "rgba(144,126,108,0.16)",dot: "var(--muted)", text: "var(--muted)" },
  }[color];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontFamily: "'Azeret Mono', monospace",
        fontSize: "10px",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-semibold" style={{ color: s.text }}>{state}</span>
    </span>
  );
}

/* ─── Judge Mode Guide ──────────────────────────────────────────────── */

function JudgeModeGuide() {
  const steps = [
    {
      n: "01",
      label: "Run risky xStocks",
      sub: "Scenario 01 below",
      action: "PAUSE expected",
      color: "var(--refuse)",
      href: "#scenarios",
    },
    {
      n: "02",
      label: "Verify receipt",
      sub: "/proof or /agent-decision",
      action: "Hash match on-chain",
      color: "var(--clear)",
      href: "/proof",
    },
    {
      n: "03",
      label: "Run safe yield",
      sub: "Scenario 02 below",
      action: "ALLOCATE expected",
      color: "var(--clear)",
      href: "#scenarios",
    },
    {
      n: "04",
      label: "Execute Fluxion",
      sub: "Scenario 03 below",
      action: "Real on-chain tx",
      color: "var(--seal)",
      href: "#scenarios",
    },
  ] as const;

  return (
    <section className="section-ruled">
      <div className="flex items-center gap-4 mb-6">
        <span
          className="rounded px-2 py-0.5"
          style={{
            fontFamily: "'Azeret Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background: "rgba(58,155,98,0.1)",
            border: "1px solid rgba(58,155,98,0.25)",
            color: "var(--clear)",
          }}
        >
          JUDGE FLOW
        </span>
        <span
          className="text-sm"
          style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Complete evaluation path — start here
        </span>
      </div>

      <div className="grid gap-0 sm:grid-cols-4 sm:divide-x"
        style={{ borderColor: "var(--border)" }}
      >
        {steps.map((s, i) => (
          <a
            key={s.n}
            href={s.href}
            className="group block transition-all hover:opacity-80 px-0 py-3 sm:px-5 sm:first:pl-0 sm:last:pr-0"
          >
            <p
              className="mb-2"
              style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", color: "rgba(144,126,108,0.4)", textTransform: "uppercase" }}
            >
              STEP {s.n}
            </p>
            <p
              className="font-semibold mb-0.5 text-sm"
              style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {s.label}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {s.sub}
            </p>
            <p
              className="mt-2 font-medium"
              style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", color: s.color }}
            >
              → {s.action}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── Scenarios ─────────────────────────────────────────────────────── */

function ScenarioSection() {
  return (
    <section id="scenarios" className="section-ruled scroll-mt-8 space-y-6">
      <div className="flex flex-col gap-1 mb-6">
        <span className="section-label">AGENT SCENARIOS</span>
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
          Run the full pipeline — pick a scenario
        </h2>
        <p
          className="text-sm mt-1 max-w-xl"
          style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Each run fetches live xStocks signals, scores deterministically, narrates via LLM, writes one{" "}
          <code
            className="rounded px-1 py-0.5 text-xs"
            style={{ fontFamily: "'Azeret Mono', monospace", background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
          >
            DecisionLogged
          </code>{" "}
          event per asset on Mantle mainnet.
        </p>
      </div>

      {/* Engine / LLM split banner */}
      <div
        className="rounded px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
        style={{ background: "rgba(120,104,212,0.06)", border: "1px solid rgba(120,104,212,0.18)" }}
      >
        <span className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5"
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", background: "rgba(255,255,255,0.06)", color: "var(--text)", letterSpacing: "0.08em" }}
          >
            DETERMINISTIC ENGINE
          </span>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>decides action + risk score</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5"
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", background: "rgba(120,104,212,0.14)", color: "#9B8FE8", letterSpacing: "0.08em" }}
          >
            LLM NARRATES
          </span>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>explains the decision — never controls it</span>
        </span>
      </div>

      {/* Agent wallet note */}
      <p
        className="text-[11px] leading-relaxed"
        style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.55)" }}
      >
        Transactions are signed by a controlled agent wallet. No user wallet connection is required — this demonstrates autonomous agent execution, not a user custody flow.
      </p>

      <div className="grid gap-5 lg:grid-cols-3">
        <ScenarioCard
          index="01"
          colorKey="refuse"
          title="After-hours xStock exposure"
          subtitle="Expected: PAUSE"
          assets={["NVDAx", "TSLAx", "SPYx"]}
          assetKind="equity"
          description="Live xStocks price + trading-halt status. Market-hours, spread, basis penalties push toward PAUSE under active policy."
          button={
            <RunAgentButton
              scenario="risky-xstocks"
              label="Run risk check"
              variant="primary"
              hint="Risk evaluation only · ~30–60s · 3 on-chain receipts"
            />
          }
        />

        <ScenarioCard
          index="02"
          colorKey="clear"
          title="Safe on-chain RWA yield"
          subtitle="Expected: ALLOCATE"
          assets={["USDY", "mETH"]}
          assetKind="yield"
          description="USDY (Ondo T-bills) and mETH (Mantle LST). No market-hours exposure. xStock signals are n/a — no hidden stubs."
          button={
            <RunAgentButton
              scenario="safe-yield"
              label="Run safe-yield scenario"
              variant="primary"
              hint="Risk evaluation · ~20–40s · 2 on-chain receipts"
            />
          }
        />

        <ScenarioCard
          index="03"
          colorKey="seal"
          title="Verified Mantle execution"
          subtitle="ROUND-TRIP ON MAINNET"
          assets={["USDC", "mETH"]}
          assetKind="execute"
          description="Real Fluxion V3 USDC→mETH→USDC round-trip. Two on-chain swaps. Two Mantlescan tx hashes. Demo wallet stays solvent."
          rfqNote="Safety gate active: xStocks execution requires an authenticated Atomic RFQ route. Neutrino commits PAUSE on-chain instead of forcing an unsafe trade."
          rfqMicro="Public xStocks signals are used for risk evaluation. Authenticated RFQ execution is intentionally gated."
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
    </section>
  );
}

function ScenarioCard({
  index,
  colorKey,
  title,
  subtitle,
  assets,
  assetKind,
  description,
  rfqNote,
  rfqMicro,
  button,
}: {
  index: string;
  colorKey: "refuse" | "clear" | "seal";
  title: string;
  subtitle: string;
  assets: string[];
  assetKind: "equity" | "yield" | "execute";
  description: string;
  rfqNote?: string;
  rfqMicro?: string;
  button: React.ReactNode;
}) {
  const scheme = {
    refuse: {
      border: "rgba(209,64,64,0.22)",
      bg: "rgba(209,64,64,0.04)",
      accent: "var(--refuse)",
      labelBg: "rgba(209,64,64,0.1)",
      labelText: "var(--refuse)",
      chipBg: "rgba(209,64,64,0.1)",
      chipText: "var(--refuse)",
    },
    clear: {
      border: "rgba(58,155,98,0.22)",
      bg: "rgba(58,155,98,0.04)",
      accent: "var(--clear)",
      labelBg: "rgba(58,155,98,0.1)",
      labelText: "var(--clear)",
      chipBg: "rgba(58,155,98,0.1)",
      chipText: "var(--clear)",
    },
    seal: {
      border: "rgba(212,160,64,0.22)",
      bg: "rgba(212,160,64,0.04)",
      accent: "var(--seal)",
      labelBg: "rgba(212,160,64,0.1)",
      labelText: "var(--seal)",
      chipBg: "rgba(212,160,64,0.1)",
      chipText: "var(--seal)",
    },
  }[colorKey];

  return (
    <div
      className="relative overflow-hidden rounded-xl flex flex-col gap-4 p-5"
      style={{ background: scheme.bg, border: `1px solid ${scheme.border}` }}
    >
      {/* Giant background number — texture, not label */}
      <span
        className="absolute right-3 bottom-0 select-none pointer-events-none leading-none"
        style={{
          fontFamily: "'Azeret Mono', monospace",
          fontSize: "140px",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px ${scheme.accent}`,
          opacity: 0.055,
        }}
      >
        {index}
      </span>

      <div className="relative space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", color: "rgba(144,126,108,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            SCENARIO {index}
          </span>
          <span
            className="rounded px-2 py-0.5 shrink-0"
            style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", background: scheme.labelBg, color: scheme.labelText }}
          >
            {subtitle}
          </span>
        </div>
        <h3
          className="text-base font-semibold leading-snug"
          style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          {title}
        </h3>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          {description}
        </p>
      </div>

      <div className="relative flex flex-wrap gap-1.5">
        {assets.map((a) => (
          <span
            key={a}
            className="rounded px-2 py-0.5 text-xs font-mono font-medium"
            style={{ background: scheme.chipBg, color: scheme.chipText, fontFamily: "'Azeret Mono', monospace" }}
          >
            {a}
          </span>
        ))}
      </div>

      {rfqNote && (
        <div className="relative space-y-1.5">
          <div
            className="rounded px-3 py-2 text-[11px] leading-relaxed"
            style={{ background: "rgba(120,104,212,0.08)", border: "1px solid rgba(120,104,212,0.2)", fontFamily: "'Azeret Mono', monospace", color: "#9B8FE8" }}
          >
            {rfqNote}
          </div>
          {rfqMicro && (
            <p
              className="px-1 text-[10px] leading-relaxed"
              style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.5)" }}
            >
              {rfqMicro}
            </p>
          )}
        </div>
      )}

      <div className="relative mt-auto">{button}</div>
    </div>
  );
}

/* ─── Data Honesty ──────────────────────────────────────────────────── */

function DataHonestySection() {
  return (
    <section className="section-ruled space-y-7">
      <div>
        <span className="section-label">§ DATA TRANSPARENCY</span>
        <h2
          className="italic"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.6rem",
            fontWeight: 600,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Every source, explicitly labelled.
        </h2>
        <p
          className="mt-2 text-sm max-w-xl"
          style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Each decision receipt pins a{" "}
          <code
            className="rounded px-1 py-0.5 text-xs"
            style={{ fontFamily: "'Azeret Mono', monospace", background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
          >
            live · stub · n/a
          </code>{" "}
          flag per signal. A judge can inspect exactly which inputs were real at decision time.
        </p>
      </div>

      <div className="grid gap-7 sm:grid-cols-3">
        <SourcePanel
          state="LIVE"
          color="clear"
          items={[
            "xStock indicative price (xStocks public API)",
            "xStock trading-halt status (xStocks public API)",
            "Mantle token addresses (verified on-chain)",
            "US market hours (evaluated at run time)",
            "Mantle decision receipts (RWADecisionLogger)",
            "Fluxion V3 execution (opt-in)",
          ]}
        />
        <SourcePanel
          state="MODELLED"
          color="seal"
          items={[
            "xStock spread / depth",
            "xStock 24h volume",
            "Order-book microstructure",
          ]}
          note="xStocks public API does not expose order-book data. Modelled and flagged as 'stub' in every receipt."
        />
        <SourcePanel
          state="AUTH GATED"
          color="gated"
          items={["xStocks execution via xChange / Atomic RFQ"]}
          note="By design: Neutrino evaluates xStocks risk and commits PAUSE on-chain. Execution is only triggered through the verified Fluxion V3 rail. xChange requires authenticated RFQ — this guardrail is intentional, not a missing feature."
        />
      </div>

      {/* Token metadata */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
        <p className="section-label mb-3">VERIFIED XSTOCK TOKEN METADATA · MANTLE MAINNET · 2026-05-21</p>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "11px" }}>
            <thead>
              <tr>
                {["SYMBOL", "UNDERLYING", "DEC", "MANTLE ADDRESS", "SOURCE"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-6 text-left font-medium uppercase tracking-wider"
                    style={{ color: "rgba(144,126,108,0.4)", fontSize: "9px", letterSpacing: "0.12em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOKEN_METADATA.map((t) => (
                <tr key={t.symbol} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="py-2 pr-6 font-semibold" style={{ color: "var(--text)" }}>{t.symbol}</td>
                  <td className="py-2 pr-6" style={{ color: "var(--muted)" }}>{t.underlying}</td>
                  <td className="py-2 pr-6" style={{ color: "var(--muted)" }}>{t.decimals}</td>
                  <td className="py-2 pr-6">
                    <a
                      href={`https://mantlescan.xyz/address/${t.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--seal)" }}
                    >
                      {t.address.slice(0, 10)}…{t.address.slice(-6)}
                    </a>
                  </td>
                  <td className="py-2" style={{ color: "rgba(144,126,108,0.5)" }}>{t.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SourcePanel({
  state,
  color,
  items,
  note,
}: {
  state: string;
  color: "clear" | "seal" | "gated";
  items: string[];
  note?: string;
}) {
  const c = {
    clear: { dot: "var(--clear)", badge: "badge-live",    text: "var(--clear)" },
    seal:  { dot: "var(--seal)",  badge: "badge-stub",    text: "var(--seal)" },
    gated: { dot: "var(--gated)", badge: "badge-notexec", text: "#9B8FE8" },
  }[color];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
        <span
          className={`${c.badge} inline-flex items-center rounded px-2 py-0.5`}
          style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          {state}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2" style={{ color: "var(--muted)", fontSize: "13px" }}>
            <span style={{ color: c.dot, marginTop: 2 }}>›</span>
            <span style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{item}</span>
          </li>
        ))}
      </ul>
      {note && (
        <p
          className="rounded p-3 leading-relaxed"
          style={{
            fontFamily: "'Azeret Mono', monospace",
            fontSize: "10px",
            color: "rgba(144,126,108,0.6)",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

const TOKEN_METADATA = [
  { symbol: "NVDAx", underlying: "NVDA · NASDAQ",  decimals: 18, address: "0xc845b2894dBddd03858fd2D643B4eF725fE0849d", source: "xStocks API + on-chain" },
  { symbol: "TSLAx", underlying: "TSLA · NASDAQ",  decimals: 18, address: "0x8aD3c73F833d3F9A523aB01476625F269aEB7Cf0", source: "xStocks API + on-chain" },
  { symbol: "SPYx",  underlying: "SPY · NYSE",     decimals: 18, address: "0x90A2a4c76b5D8c0bc892A69EA28Aa775a8f2dD48", source: "xStocks API + on-chain" },
  { symbol: "USDY",  underlying: "Ondo T-bills",   decimals: 18, address: "0x5bE26527e817998A7206475496fDE1E68957c5A6", source: "Mantle ERC-20" },
  { symbol: "mETH",  underlying: "Mantle LST",     decimals: 18, address: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0", source: "Mantle ERC-20" },
] as const;

/* ─── Attack Surface ────────────────────────────────────────────────── */

function AttackSurfaceSection() {
  const qa = [
    {
      q: "Is the AI deciding?",
      a: "No. A deterministic rules engine picks the action and risk score. Claude Haiku 4.5 only narrates the decision. llmControlsAction = false in every receipt.",
      verdict: "No.",
      color: "var(--clear)",
    },
    {
      q: "Is the xStock price fake?",
      a: "The xStocks public API returns a real indicative price and trading-halt status. Spread / depth / volume are modelled and flagged as 'stub' in every receipt.",
      verdict: "No.",
      color: "var(--clear)",
    },
    {
      q: "Why doesn't the xStocks scenario execute a trade?",
      a: "By design. Neutrino's job is risk evaluation, not trade facilitation. For after-hours xStocks the engine emits PAUSE and commits a verifiable receipt on-chain — forcing a trade would bypass the safety gate. Authenticated RFQ execution is intentionally excluded; Fluxion V3 is the only verified execution rail.",
      verdict: "Safety gate.",
      color: "var(--gated)",
    },
    {
      q: "Is the hash verifiable?",
      a: "Yes. Click 'Verify hash' on any receipt — keccak256(canonicalJson) must equal the bytes32 reasonHash in the DecisionLogged event on Mantlescan. The JSON is byte-stable.",
      verdict: "Yes.",
      color: "var(--seal)",
    },
    {
      q: "Can it actually execute?",
      a: "Scenario 03 triggers a real Fluxion V3 USDC→mETH→USDC round-trip on Mantle mainnet. Two Mantlescan tx hashes are produced and shown below.",
      verdict: "Yes.",
      color: "var(--seal)",
    },
  ] as const;

  return (
    <section className="section-ruled space-y-0">
      <div className="mb-7">
        <span className="section-label" style={{ color: "var(--refuse)" }}>JUDGE ATTACK SURFACE</span>
        <h2
          className="italic"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.6rem",
            fontWeight: 600,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Anticipated objections.
        </h2>
      </div>

      {qa.map(({ q, a, verdict, color }, i) => (
        <div
          key={q}
          className="section-ruled"
          style={{ paddingTop: "20px", marginTop: "0", paddingBottom: "20px" }}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr] items-start">
            <div>
              <p
                className="italic"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "1.05rem",
                  color: "var(--text)",
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: "rgba(144,126,108,0.35)", marginRight: "8px" }}>§{i + 1}</span>
                {q}
              </p>
              <p
                className="mt-2 text-xl italic font-semibold"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color }}
              >
                {verdict}
              </p>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {a}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ─── Why Mantle ────────────────────────────────────────────────────── */

function WhyMantleSection() {
  return (
    <section className="section-ruled space-y-8">
      <span className="section-label" style={{ color: "var(--clear)" }}>WHY THIS MATTERS FOR MANTLE</span>

      {/* Pull quote */}
      <blockquote>
        <p
          className="italic leading-[1.15] tracking-tight max-w-3xl"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          &ldquo;Every autonomous agent is eventually asked:{" "}
          <em style={{ color: "var(--seal)" }}>should this money move?</em>{" "}
          Neutrino was built for that moment.&rdquo;
        </p>
        <div
          className="mt-4 h-px max-w-xs"
          style={{ background: "linear-gradient(90deg, var(--border-hi) 0%, transparent 100%)" }}
        />
      </blockquote>

      {/* Body */}
      <p
        className="text-sm leading-relaxed max-w-3xl"
        style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
      >
        Mantle is building institutional RWA execution rails — xStocks equities, Atomic RFQ,
        USDY, INIT Capital yield pools, mETH as native collateral. As more autonomous agents
        touch this capital, the scarce layer is no longer execution. It&rsquo;s{" "}
        <strong style={{ color: "var(--text)" }}>trustworthy autonomous judgment</strong>.
        Neutrino is that layer: the agent that decides <em>when</em> the rails are safe,
        records the full rationale on-chain, and only then allows capital to move.
      </p>

      {/* 3 pillars */}
      <div className="grid gap-5 sm:grid-cols-3">
        {[
          {
            title: "Engine separated from narration",
            body: "The deterministic rules engine picks the action. Claude Haiku 4.5 only explains. Decisions are reproducible from the receipt without LLM nondeterminism.",
            accent: "var(--muted)",
          },
          {
            title: "Source-freshness on every receipt",
            body: "Every decision payload pins live / stub / n/a per signal. Nothing is hidden — judges see exactly which inputs were real at the moment of decision.",
            accent: "var(--clear)",
          },
          {
            title: "Verifiable by re-hash",
            body: "The full audit JSON is byte-stable. keccak256(payload) equals the bytes32 reasonHash emitted by RWADecisionLogger on Mantle. Verify it yourself.",
            accent: "var(--seal)",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-lg p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div
              className="h-0.5 w-7 rounded-full mb-3"
              style={{ background: c.accent }}
            />
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {c.title}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
