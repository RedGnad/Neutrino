import Link from "next/link";
import { RunAgentButton } from "@/components/RunAgentButton";
import { LatestExecution } from "@/components/LatestExecution";
import { BlackBoxCard } from "@/components/BlackBoxCard";
import { DecisionTimeline } from "@/components/DecisionTimeline";
import { NETWORK_LABEL, LOGGER_ADDRESS, AGENT_ADDRESS, EXPLORER_ADDR } from "@/lib/onchain";

export default function Home() {
  return (
    <div className="space-y-12">
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

function Hero() {
  return (
    <section
      className="-mx-6 -mt-10 px-6 pt-14 pb-14"
      style={{ background: "linear-gradient(180deg, #070A0F 0%, #0B1020 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-8">
          <span
            className="h-1.5 w-1.5 rounded-full animate-live"
            style={{ background: "var(--bb-teal)" }}
          />
          <span
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
          >
            Neutrino · AI × RWA · {NETWORK_LABEL}
          </span>
        </div>

        {/* Two-column hero */}
        <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
          {/* Left: Headline */}
          <div className="space-y-6 max-w-xl">
            <div>
              <h1
                className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl"
                style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                Tokenized stocks
                <br />
                trade 24/7.
                <br />
                <span style={{ color: "var(--bb-muted)" }}>
                  Their underlying
                  <br />
                  markets don&rsquo;t.
                </span>
              </h1>
              <p
                className="mt-6 text-base leading-relaxed"
                style={{ color: "var(--bb-muted)" }}
              >
                Neutrino is the risk-judgment layer for autonomous Mantle RWA agents.
                It reads live xStocks signals, scores risk with deterministic rules,
                writes a verifiable receipt on Mantle, and executes only through
                a verified Mantle rail. The engine decides. The LLM explains.
              </p>
            </div>

            {/* Proof chips */}
            <div className="flex flex-wrap gap-2">
              <ProofChip label="xStocks price + status" state="LIVE" color="teal" />
              <ProofChip label="Mantle receipts" state="LIVE" color="teal" />
              <ProofChip label="Fluxion execution" state="LIVE" color="teal" />
              <ProofChip label="xChange RFQ" state="AUTH GATED" color="violet" />
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="#scenarios"
                className="inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold transition-all"
                style={{ background: "var(--bb-teal)", color: "#070A0F" }}
              >
                Run the agent
              </Link>
              <Link
                href="/proof"
                className="inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--bb-text)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                On-chain proofs
              </Link>
            </div>

            {/* Contract addresses */}
            {(LOGGER_ADDRESS || AGENT_ADDRESS) ? (
              <div
                className="flex flex-wrap gap-4 pt-2 text-[11px]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {LOGGER_ADDRESS ? (
                  <a
                    href={`${EXPLORER_ADDR}/${LOGGER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors"
                    style={{ color: "rgba(138,148,166,0.5)" }}
                  >
                    RWADecisionLogger:{" "}
                    <span style={{ color: "var(--bb-muted)" }}>
                      {LOGGER_ADDRESS.slice(0, 10)}…{LOGGER_ADDRESS.slice(-6)}
                    </span>
                    <span style={{ color: "var(--bb-teal)" }}>↗</span>
                  </a>
                ) : null}
                {AGENT_ADDRESS ? (
                  <a
                    href={`${EXPLORER_ADDR}/${AGENT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors"
                    style={{ color: "rgba(138,148,166,0.5)" }}
                  >
                    RWAAgent:{" "}
                    <span style={{ color: "var(--bb-muted)" }}>
                      {AGENT_ADDRESS.slice(0, 10)}…{AGENT_ADDRESS.slice(-6)}
                    </span>
                    <span style={{ color: "var(--bb-teal)" }}>↗</span>
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right: BlackBoxCard — simulated preview, no fake verified */}
          <div className="flex items-start justify-center lg:justify-end">
            <BlackBoxCard
              label="SIMULATED PREVIEW"
              data={{
                asset: "TSLAx / TSLA",
                signal: "after-hours · no halt",
                rfqReadiness: "auth-gated",
                score: 480,
                action: "PAUSE",
                receiptHash: "run agent to generate",
                verified: undefined,
                timestamp: "Mantle mainnet",
                live: false,
              }}
            />
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
  color: "teal" | "amber" | "violet" | "muted";
}) {
  const styles: Record<string, { bg: string; border: string; dot: string; text: string }> = {
    teal:   { bg: "rgba(45,212,165,0.08)",  border: "rgba(45,212,165,0.25)",  dot: "var(--bb-teal)",   text: "var(--bb-teal)" },
    amber:  { bg: "rgba(245,166,35,0.08)",  border: "rgba(245,166,35,0.25)",  dot: "var(--bb-amber)",  text: "var(--bb-amber)" },
    violet: { bg: "rgba(124,92,252,0.08)",  border: "rgba(124,92,252,0.25)",  dot: "#9D84FF",          text: "#9D84FF" },
    muted:  { bg: "rgba(138,148,166,0.08)", border: "rgba(138,148,166,0.2)",  dot: "var(--bb-muted)",  text: "var(--bb-muted)" },
  };
  const s = styles[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
      style={{ background: s.bg, border: `1px solid ${s.border}`, fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      <span style={{ color: "var(--bb-muted)" }}>{label}</span>
      <span className="font-semibold" style={{ color: s.text }}>{state}</span>
    </span>
  );
}

/* ─── Scenarios ─────────────────────────────────────────────────────── */

function ScenarioSection() {
  return (
    <section id="scenarios" className="scroll-mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-widest mb-1"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
          >
            AGENT SCENARIOS
          </p>
          <h2
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Run the full pipeline — pick a scenario
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--bb-muted)" }}>
            Each run fetches live xStocks signals, scores deterministically,
            narrates via LLM, writes one{" "}
            <code
              className="rounded px-1 py-0.5 text-xs"
              style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(255,255,255,0.05)", color: "var(--bb-text)" }}
            >
              DecisionLogged
            </code>{" "}
            event per asset on Mantle mainnet.
          </p>
        </div>
      </div>

      {/* Deterministic / LLM banner */}
      <div
        className="rounded-md px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
        style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--bb-text)" }}
          >
            DETERMINISTIC ENGINE
          </span>
          <span style={{ color: "var(--bb-muted)" }}>decides action + risk score</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
            style={{ background: "rgba(124,92,252,0.15)", color: "#9D84FF" }}
          >
            LLM NARRATES
          </span>
          <span style={{ color: "var(--bb-muted)" }}>explains the decision · never controls it</span>
        </div>
      </div>

      {/* 3 scenario cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ScenarioCard
          index="01"
          colorKey="pause"
          title="After-hours xStock exposure"
          subtitle="Expected: PAUSE"
          assets={["NVDAx", "TSLAx", "SPYx"]}
          assetKind="equity"
          description="Live xStocks price + trading-halt status. Market-hours, spread, basis penalties push toward PAUSE under active policy."
          button={
            <RunAgentButton
              scenario="risky-xstocks"
              label="Run risky scenario"
              variant="primary"
              hint="Decisions only · ~30–60s · 3 on-chain receipts"
            />
          }
        />

        <ScenarioCard
          index="02"
          colorKey="allocate"
          title="Safe on-chain RWA yield"
          subtitle="Expected: ALLOCATE"
          assets={["USDY", "mETH"]}
          assetKind="yield"
          description="USDY (Ondo T-bills) and mETH (Mantle LST). No market-hours exposure. xStock signals are n/a — no hidden stubs."
          button={
            <RunAgentButton
              scenario="safe-yield"
              label="Run safe scenario"
              variant="primary"
              hint="Decisions only · ~20–40s · 2 on-chain receipts"
            />
          }
        />

        <ScenarioCard
          index="03"
          colorKey="execute"
          title="Verified Mantle execution"
          subtitle="ROUND-TRIP ON MAINNET"
          assets={["USDC", "mETH"]}
          assetKind="execute"
          description="Real Fluxion V3 USDC→mETH→USDC round-trip. Two on-chain swaps. Two Mantlescan tx hashes. Demo wallet stays solvent."
          rfqNote="xChange / Atomic RFQ not executed — requires API key + registered wallet + auth quote flow."
          button={
            <RunAgentButton
              scenario="safe-yield"
              executeOnChain
              label="Run + execute on Mantle"
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
  button,
}: {
  index: string;
  colorKey: "pause" | "allocate" | "execute";
  title: string;
  subtitle: string;
  assets: string[];
  assetKind: "equity" | "yield" | "execute";
  description: string;
  rfqNote?: string;
  button: React.ReactNode;
}) {
  const scheme = {
    pause:   { border: "rgba(255,107,53,0.3)",  bg: "rgba(255,107,53,0.04)",  accent: "var(--bb-orange)", labelBg: "rgba(255,107,53,0.12)", labelText: "var(--bb-orange)" },
    allocate: { border: "rgba(45,212,165,0.3)", bg: "rgba(45,212,165,0.04)", accent: "var(--bb-teal)",   labelBg: "rgba(45,212,165,0.12)", labelText: "var(--bb-teal)" },
    execute:  { border: "rgba(245,166,35,0.3)", bg: "rgba(245,166,35,0.04)", accent: "var(--bb-amber)",  labelBg: "rgba(245,166,35,0.12)", labelText: "var(--bb-amber)" },
  }[colorKey];

  const assetColors: Record<string, string> = {
    equity:  "rgba(255,107,53,0.12)",
    yield:   "rgba(45,212,165,0.12)",
    execute: "rgba(245,166,35,0.12)",
  };
  const assetTextColors: Record<string, string> = {
    equity:  "var(--bb-orange)",
    yield:   "var(--bb-teal)",
    execute: "var(--bb-amber)",
  };

  return (
    <div
      className="rounded-xl flex flex-col gap-4 p-5"
      style={{ background: scheme.bg, border: `1px solid ${scheme.border}` }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-widest"
            style={{ color: "rgba(138,148,166,0.5)" }}
          >
            SCENARIO {index}
          </span>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0"
            style={{ background: scheme.labelBg, color: scheme.labelText }}
          >
            {subtitle}
          </span>
        </div>
        <h3
          className="text-base font-semibold leading-snug"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>
          {description}
        </p>
      </div>

      {/* Asset chips */}
      <div className="flex flex-wrap gap-1.5">
        {assets.map((a) => (
          <span
            key={a}
            className="rounded px-2 py-0.5 text-xs font-mono font-medium"
            style={{ background: assetColors[assetKind], color: assetTextColors[assetKind] }}
          >
            {a}
          </span>
        ))}
      </div>

      {/* RFQ note */}
      {rfqNote ? (
        <div
          className="rounded px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.2)", fontFamily: "'IBM Plex Mono', monospace", color: "#9D84FF" }}
        >
          {rfqNote}
        </div>
      ) : null}

      {/* Button */}
      <div className="mt-auto">
        {button}
      </div>
    </div>
  );
}

/* ─── Data honesty ──────────────────────────────────────────────────── */

function DataHonestySection() {
  return (
    <section className="bb-section space-y-6">
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
        >
          DATA HONESTY
        </p>
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Every source is labelled — nothing is hidden
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--bb-muted)" }}>
          Each decision receipt pins a{" "}
          <code
            className="rounded px-1 py-0.5 text-xs"
            style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(255,255,255,0.05)", color: "var(--bb-text)" }}
          >
            live · stub · n/a
          </code>{" "}
          flag per signal. A judge can inspect exactly which inputs were real at decision time.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <SourceColumn
          state="LIVE"
          color="teal"
          items={[
            "xStock indicative price (xStocks public API)",
            "xStock trading-halt status (xStocks public API)",
            "Mantle token addresses (verified on-chain 2026-05-21)",
            "US market hours (evaluated at run time)",
            "Mantle decision receipts (RWADecisionLogger)",
            "Fluxion V3 execution (opt-in)",
          ]}
        />
        <SourceColumn
          state="MODELLED"
          color="amber"
          items={[
            "xStock spread / depth",
            "xStock 24h volume",
            "Order-book microstructure",
          ]}
          note="xStocks public API does not expose order-book data. Modelled and flagged in every receipt."
        />
        <SourceColumn
          state="AUTH GATED"
          color="violet"
          items={["xChange / Atomic RFQ"]}
          note="xChange is an authenticated issuer-direct channel. Requires API key + registered wallet + quote flow. Neutrino evaluates xStocks risk; execution routes through verified Mantle rails only."
          rfqNote
        />
      </div>

      {/* Token metadata table */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 20 }}>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-3"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
        >
          VERIFIED XSTOCK TOKEN METADATA · MANTLE MAINNET · 2026-05-21
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <thead>
              <tr>
                {["SYMBOL", "UNDERLYING", "DEC", "MANTLE ADDRESS", "SOURCE"].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-6 text-left font-medium uppercase tracking-wider text-[10px]"
                    style={{ color: "rgba(138,148,166,0.4)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOKEN_METADATA.map((t, i) => (
                <tr
                  key={t.symbol}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td className="py-2 pr-6 font-semibold" style={{ color: "var(--bb-text)" }}>{t.symbol}</td>
                  <td className="py-2 pr-6" style={{ color: "var(--bb-muted)" }}>{t.underlying}</td>
                  <td className="py-2 pr-6" style={{ color: "var(--bb-muted)" }}>{t.decimals}</td>
                  <td className="py-2 pr-6">
                    <a
                      href={`https://mantlescan.xyz/address/${t.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--bb-teal)" }}
                    >
                      {t.address.slice(0, 10)}…{t.address.slice(-6)}
                    </a>
                  </td>
                  <td className="py-2" style={{ color: "rgba(138,148,166,0.5)" }}>{t.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SourceColumn({
  state,
  color,
  items,
  note,
  rfqNote,
}: {
  state: string;
  color: "teal" | "amber" | "violet";
  items: string[];
  note?: string;
  rfqNote?: boolean;
}) {
  const colorMap = {
    teal:   { dot: "var(--bb-teal)",  badge: "badge-live",    label: "var(--bb-teal)" },
    amber:  { dot: "var(--bb-amber)", badge: "badge-stub",    label: "var(--bb-amber)" },
    violet: { dot: "#9D84FF",         badge: "badge-notexec", label: "#9D84FF" },
  }[color];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: colorMap.dot }} />
        <span
          className={`${colorMap.badge} inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest`}
        >
          {state}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm" style={{ color: "var(--bb-muted)" }}>
            <span style={{ color: colorMap.dot, marginTop: 2 }}>›</span>
            {item}
          </li>
        ))}
      </ul>
      {note ? (
        <p
          className="text-[11px] leading-relaxed rounded p-3"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: "rgba(138,148,166,0.6)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {rfqNote ? <strong style={{ color: "var(--bb-muted)" }}>RFQ readiness: not executable in this demo. </strong> : null}
          {note}
        </p>
      ) : null}
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

/* ─── Judge Mode ────────────────────────────────────────────────────── */

function JudgeModeGuide() {
  const steps = [
    {
      n: "01",
      label: "Run risky xStocks",
      sub: "Scenario 01 below",
      action: "PAUSE expected",
      color: "var(--bb-orange)",
      bg: "rgba(255,107,53,0.08)",
      border: "rgba(255,107,53,0.2)",
      href: "#scenarios",
    },
    {
      n: "02",
      label: "Verify receipt",
      sub: "Open /proof or agent-decision",
      action: "Hash match on-chain",
      color: "var(--bb-teal)",
      bg: "rgba(45,212,165,0.08)",
      border: "rgba(45,212,165,0.2)",
      href: "/proof",
    },
    {
      n: "03",
      label: "Run safe yield",
      sub: "Scenario 02 below",
      action: "ALLOCATE expected",
      color: "var(--bb-teal)",
      bg: "rgba(45,212,165,0.06)",
      border: "rgba(45,212,165,0.15)",
      href: "#scenarios",
    },
    {
      n: "04",
      label: "Execute Fluxion",
      sub: "Scenario 03 below",
      action: "Real on-chain tx",
      color: "var(--bb-amber)",
      bg: "rgba(245,166,35,0.08)",
      border: "rgba(245,166,35,0.2)",
      href: "#scenarios",
    },
  ] as const;

  return (
    <section
      className="rounded-xl px-6 py-5"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
          style={{ background: "rgba(45,212,165,0.12)", border: "1px solid rgba(45,212,165,0.3)", color: "var(--bb-teal)" }}
        >
          JUDGE FLOW
        </span>
        <span className="text-xs" style={{ color: "var(--bb-muted)" }}>
          Complete evaluation path — start here
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {steps.map((s) => (
          <a
            key={s.n}
            href={s.href}
            className="rounded-lg p-4 block transition-opacity hover:opacity-80"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <p
              className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-1"
              style={{ color: "rgba(138,148,166,0.4)" }}
            >
              STEP {s.n}
            </p>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {s.label}
            </p>
            <p className="text-[11px]" style={{ color: "var(--bb-muted)" }}>{s.sub}</p>
            <p className="mt-2 text-[10px] font-mono font-medium" style={{ color: s.color }}>
              → {s.action}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── Attack Surface ────────────────────────────────────────────────── */

function AttackSurfaceSection() {
  const qa = [
    {
      q: "Is the AI deciding?",
      a: "No. A deterministic rules engine picks the action and risk score. Claude Haiku 4.5 only narrates the decision in plain language. llmControlsAction = false in every receipt.",
      color: "var(--bb-teal)",
    },
    {
      q: "Is the xStock price fake?",
      a: "No. The xStocks public API returns a real indicative price and trading-halt status for each asset. Spread / depth / volume are modelled and explicitly flagged as 'stub' in every receipt.",
      color: "var(--bb-teal)",
    },
    {
      q: "Why no xChange RFQ execution?",
      a: "xChange is an authenticated institutional channel: it requires an API key, a registered wallet, an EIP-712 signed quote and a separate on-chain execution step. This demo uses Fluxion V3 as the verified execution rail.",
      color: "#9D84FF",
    },
    {
      q: "Is the hash really verifiable?",
      a: "Yes. Open any receipt, click 'Verify hash' — keccak256(canonicalJson) must equal the bytes32 reasonHash stored in the DecisionLogged event on Mantlescan. The JSON is byte-stable.",
      color: "var(--bb-teal)",
    },
    {
      q: "Can it actually execute on-chain?",
      a: "Yes. Scenario 03 triggers a real Fluxion V3 USDC→mETH→USDC round-trip on Mantle mainnet. Two Mantlescan tx hashes are produced. The demo wallet recycles capital to stay solvent.",
      color: "var(--bb-amber)",
    },
  ] as const;

  return (
    <section className="bb-section space-y-5">
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-1"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-orange)" }}
        >
          JUDGE ATTACK SURFACE
        </p>
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Pre-answered objections
        </h2>
      </div>
      <div className="space-y-3">
        {qa.map(({ q, a, color }) => (
          <div
            key={q}
            className="rounded-lg px-4 py-4 grid gap-1 sm:grid-cols-[1fr_2fr]"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p
              className="text-sm font-semibold pr-4"
              style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {q}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--bb-muted)" }}>
              <span className="font-semibold mr-1.5" style={{ color }}>→</span>
              {a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Why Mantle ────────────────────────────────────────────────────── */

function WhyMantleSection() {
  return (
    <section className="bb-section">
      <p
        className="text-[10px] font-medium uppercase tracking-widest mb-3"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
      >
        WHY THIS MATTERS FOR MANTLE
      </p>
      <h2
        className="text-lg font-semibold tracking-tight mb-3"
        style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        The black box for autonomous RWA agents
      </h2>
      <p className="text-sm leading-relaxed max-w-3xl" style={{ color: "var(--bb-muted)" }}>
        Mantle is building institutional RWA execution rails — xStocks equities, Atomic RFQ,
        USDY, INIT Capital yield pools, mETH as native collateral. As more autonomous agents
        touch this capital, the scarce layer is no longer execution. It&rsquo;s{" "}
        <strong style={{ color: "var(--bb-text)" }}>trustworthy autonomous judgment</strong>.
        Neutrino is that layer: the agent that decides <em>when</em> the rails are safe,
        records the full rationale on-chain, and only then allows capital to move.
        Every decision is a verifiable record — like a flight recorder for on-chain risk.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Engine separated from narration", body: "The deterministic rules engine picks the action. Claude Haiku 4.5 only explains. Decisions are reproducible from the receipt without LLM nondeterminism.", accent: "var(--bb-muted)" },
          { title: "Source-freshness on every receipt", body: "Every decision payload pins live / stub / n/a per signal. Nothing is hidden — judges see exactly which inputs were real at the moment of decision.", accent: "var(--bb-teal)" },
          { title: "Verifiable by re-hash", body: "The full audit JSON is byte-stable. keccak256(payload) equals the bytes32 reasonHash emitted by RWADecisionLogger on Mantle. Verify it yourself.", accent: "#9D84FF" },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-lg p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="h-0.5 w-8 rounded-full mb-3" style={{ background: c.accent }} />
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--bb-text)" }}>{c.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
