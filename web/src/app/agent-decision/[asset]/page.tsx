import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EXPLORER_ADDR,
  EXPLORER_BLOCK,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  fetchDecisionsForAsset,
  findTrackedAsset,
  timeAgo,
} from "@/lib/onchain";
import { DecisionVerifier } from "@/components/DecisionVerifier";
import { CopyButton } from "@/components/CopyButton";
import {
  ConsoleCard,
  HashText,
  MetricStrip,
  RiskBar,
  SectionHeader,
  StatusPill,
} from "@/components/Console";

export const revalidate = 10;

interface Props {
  params: Promise<{ asset: string }>;
}

export default async function AgentDecisionPage({ params }: Props) {
  const { asset: symbol } = await params;
  const asset = findTrackedAsset(symbol);
  if (!asset) notFound();

  const decisions = LOGGER_ADDRESS ? await fetchDecisionsForAsset(asset.address, 20).catch(() => []) : [];
  const latest = decisions[0] ?? null;
  const category = asset.kind === "tokenized_equity" ? "Tokenized equity" : "Yield-bearing";
  const market = "market" in asset ? asset.market : "on-chain";

  return (
    <div className="space-y-8" style={{ color: "var(--text)" }}>
      <section className="space-y-5">
        <Link
          href="/market-map"
          className="text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}
        >
          Back to market map
        </Link>

        <ConsoleCard accent={latest?.action === "ALLOCATE" ? "green" : latest?.action === "PAUSE" ? "amber" : "slate"} className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="section-label">Decision receipt</span>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1
                  className="font-display italic leading-none"
                  style={{ color: "var(--text)", fontSize: "clamp(2.6rem, 6vw, 4.4rem)", fontWeight: 600 }}
                >
                  {asset.symbol}
                </h1>
                {"reference" in asset && asset.reference ? (
                  <span className="text-sm" style={{ color: "var(--muted)" }}>
                    references {asset.reference}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                AI proposes, policy validates or overrides, Mantle verifies the final receipt. The
                reasonHash covers the full loop and can be recomputed from canonical JSON.
              </p>
            </div>
            <StatusPill value={latest?.action ?? "N/A"} className="self-start">
              {latest?.action ?? "N/A"}
            </StatusPill>
          </div>

          <MetricStrip
            columns={4}
            items={[
              { label: "Asset type", value: category, tone: "blue" },
              { label: "Market", value: market, tone: "slate" },
              {
                label: "Tx status",
                value: latest ? "written to Mantle" : "no receipt yet",
                tone: latest ? "green" : "slate",
              },
              {
                label: "Hash status",
                value: latest ? "committed on-chain" : "n/a",
                tone: latest ? "gold" : "slate",
              },
            ]}
          />

          {latest ? (
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <ConsoleCard compact accent={latest.action === "ALLOCATE" ? "green" : latest.action === "PAUSE" ? "amber" : "slate"}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
                  Risk score
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--text)", fontFamily: "'Azeret Mono', monospace" }}>
                  {latest.riskScore}<span className="text-sm" style={{ color: "var(--muted)" }}>/1000</span>
                </p>
                <div className="mt-3">
                  <RiskBar value={latest.riskScore} label={false} />
                </div>
              </ConsoleCard>

              <ConsoleCard compact accent="gold" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
                      Latest on-chain commitment
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                      Written {timeAgo(latest.timestamp)} in{" "}
                      <a href={`${EXPLORER_BLOCK}/${latest.blockNumber}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--clear)" }}>
                        block {latest.blockNumber.toString()}
                      </a>
                    </p>
                  </div>
                  <HashText value={latest.txHash} href={`${EXPLORER_TX}/${latest.txHash}`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <HashField label="Reason hash" value={latest.reasonHash} />
                  <HashField label="Policy hash" value={latest.policyHash} />
                  <HashField label="Caller" value={latest.caller} link={`${EXPLORER_ADDR}/${latest.caller}`} />
                  <HashField label="Tx" value={latest.txHash} link={`${EXPLORER_TX}/${latest.txHash}`} />
                </div>
              </ConsoleCard>
            </div>
          ) : (
            <Empty
              title="No on-chain decision for this asset yet"
              body="Run the agent from the home page to generate the first decision."
            />
          )}
        </ConsoleCard>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Kind" value={category} />
        <Stat label="Market" value={market} />
        <Stat
          label="Token address"
          value={`${asset.address.slice(0, 8)}...${asset.address.slice(-4)}`}
          mono
          link={`${EXPLORER_ADDR}/${asset.address}`}
        />
      </section>

      {latest ? (
        <DecisionVerifier
          txHash={latest.txHash}
          reasonHash={latest.reasonHash}
          policyHash={latest.policyHash}
        />
      ) : null}

      {decisions.length > 1 ? (
        <section className="section-ruled space-y-4">
          <SectionHeader
            eyebrow={`Decision history (${decisions.length})`}
            title="Previous policy outcomes for this asset."
            compact
          />
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  {["When", "Action", "Risk", "Block", "Tx"].map((h, i) => (
                    <th key={h} className={i >= 2 && i <= 3 ? "text-right" : "text-left"}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.txHash}>
                    <td className="text-xs" style={{ color: "var(--muted)" }}>{timeAgo(d.timestamp)}</td>
                    <td><StatusPill value={d.action}>{d.action}</StatusPill></td>
                    <td className="text-right">
                      <div className="ml-auto w-28">
                        <RiskBar value={d.riskScore} label />
                      </div>
                    </td>
                    <td className="text-right text-xs tabular-nums" style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}>
                      {d.blockNumber.toString()}
                    </td>
                    <td>
                      <HashText value={d.txHash} href={`${EXPLORER_TX}/${d.txHash}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.52)" }}>
        Decision receipts cover schema neutrino.decision.v2: agent identity, asset metadata, market
        snapshot, xStocks public-API data when available, source-freshness flags, risk breakdown,
        policy, AI proposal, policy review, action, score, narration metadata. The reasonHash covers
        the full loop: AI proposal, policy review, and final on-chain commitment.
      </p>
    </div>
  );
}

function Stat({ label, value, mono = false, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  const content = (
    <ConsoleCard compact accent="slate">
      <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.58)" }}>
        {label}
      </p>
      <p className={`mt-1 font-semibold ${mono ? "text-sm" : "text-base"}`} style={{ color: link ? "var(--clear)" : "var(--text)", fontFamily: mono ? "'Azeret Mono', monospace" : undefined }}>
        {value}
      </p>
    </ConsoleCard>
  );
  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80">
        {content}
      </a>
    );
  }
  return content;
}

function HashField({ label, value, link }: { label: string; value: string; link?: string }) {
  const content = link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
      <HashText value={value} chars={10} />
    </a>
  ) : (
    <HashText value={value} chars={10} />
  );

  return (
    <div className="rounded-md px-3 py-2" style={{ background: "rgba(0,0,0,0.16)", border: "1px solid var(--border)" }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest" style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.56)" }}>
          {label}
        </p>
        <CopyButton value={value} label="copy" copiedLabel="copied" />
      </div>
      {content}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <ConsoleCard accent="amber" compact>
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{body}</p>
    </ConsoleCard>
  );
}
