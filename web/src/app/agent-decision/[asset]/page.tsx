import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  EXPLORER_ADDR,
  EXPLORER_BLOCK,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  fetchDecisionsForAsset,
  findTrackedAsset,
  statusFor,
  timeAgo,
} from '@/lib/onchain';
import { DecisionVerifier } from '@/components/DecisionVerifier';

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
  const status = statusFor(latest?.action ?? null, latest?.riskScore ?? null);

  const actionColor =
    latest?.action === "PAUSE" ? "var(--bb-orange)"
    : latest?.action === "ALLOCATE" ? "var(--bb-teal)"
    : "var(--bb-amber)";

  return (
    <div className="space-y-6" style={{ color: "var(--bb-text)" }}>
      {/* Breadcrumb + heading */}
      <div>
        <Link
          href="/market-map"
          className="text-xs font-mono transition-opacity hover:opacity-80"
          style={{ color: "var(--bb-muted)" }}
        >
          ← Market map
        </Link>
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {asset.symbol}
          </h1>
          {'reference' in asset && asset.reference ? (
            <span className="text-sm" style={{ color: "var(--bb-muted)" }}>
              references {asset.reference}
            </span>
          ) : null}
          <span
            className="ml-auto text-[10px] font-mono font-medium uppercase tracking-widest rounded px-2 py-0.5"
            style={{
              background: status.label === 'ALLOCATE' ? 'rgba(45,212,165,0.12)' : status.label === 'PAUSE' ? 'rgba(255,107,53,0.12)' : 'rgba(245,166,35,0.12)',
              border: `1px solid ${status.label === 'ALLOCATE' ? 'rgba(45,212,165,0.3)' : status.label === 'PAUSE' ? 'rgba(255,107,53,0.3)' : 'rgba(245,166,35,0.3)'}`,
              color: status.label === 'ALLOCATE' ? 'var(--bb-teal)' : status.label === 'PAUSE' ? 'var(--bb-orange)' : 'var(--bb-amber)',
            }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Asset meta stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="KIND" value={asset.kind === 'tokenized_equity' ? 'Tokenized equity' : 'Yield-bearing'} />
        <Stat label="MARKET" value={'market' in asset ? asset.market : 'on-chain'} />
        <Stat
          label="TOKEN ADDRESS"
          value={`${asset.address.slice(0, 8)}…${asset.address.slice(-4)}`}
          mono
          link={`${EXPLORER_ADDR}/${asset.address}`}
        />
      </section>

      {latest ? (
        <section
          className="rounded-xl p-6 space-y-4"
          style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
          >
            LATEST ON-CHAIN DECISION
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <div
              className="rounded-lg px-5 py-3 text-center"
              style={{ background: `${actionColor}12`, border: `1px solid ${actionColor}40` }}
            >
              <p className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--bb-muted)" }}>ACTION</p>
              <p
                className="text-3xl font-bold tracking-wider"
                style={{ color: actionColor, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {latest.action}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--bb-muted)" }}>
                Risk score{' '}
                <span className="font-semibold text-base tabular-nums" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {latest.riskScore}
                </span>
                <span style={{ color: "rgba(138,148,166,0.4)" }}>/1000</span>
                {' · written '}
                {timeAgo(latest.timestamp)} in{' '}
                <a
                  href={`${EXPLORER_BLOCK}/${latest.blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                  style={{ color: "var(--bb-teal)" }}
                >
                  block {latest.blockNumber.toString()}
                </a>
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HashField label="REASON HASH (off-chain JSON)" value={latest.reasonHash} />
            <HashField label="POLICY HASH" value={latest.policyHash} />
            <HashField label="CALLER" value={latest.caller} link={`${EXPLORER_ADDR}/${latest.caller}`} />
            <HashField label="TX" value={latest.txHash} link={`${EXPLORER_TX}/${latest.txHash}`} />
          </div>
        </section>
      ) : (
        <Empty
          title="No on-chain decision for this asset yet"
          body="Run the agent from the home page to generate the first decision."
        />
      )}

      {decisions.length > 1 ? (
        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
            >
              DECISION HISTORY ({decisions.length})
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["When", "Action", "Risk", "Block", "Tx"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest ${i >= 2 && i <= 3 ? "text-right" : "text-left"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)", background: "rgba(0,0,0,0.15)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, idx) => {
                const ac = d.action === "PAUSE" ? "var(--bb-orange)" : d.action === "ALLOCATE" ? "var(--bb-teal)" : "var(--bb-amber)";
                return (
                  <tr
                    key={d.txHash}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: idx < decisions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--bb-muted)" }}>{timeAgo(d.timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: ac, fontFamily: "'IBM Plex Mono', monospace" }}>{d.action}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.riskScore}<span style={{ color: "rgba(138,148,166,0.4)" }}>/1000</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: "var(--bb-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.blockNumber.toString()}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${EXPLORER_TX}/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs transition-opacity hover:opacity-80"
                        style={{ color: "var(--bb-teal)" }}
                      >
                        {d.txHash.slice(0, 10)}… ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {latest ? (
        <DecisionVerifier
          txHash={latest.txHash}
          reasonHash={latest.reasonHash}
          policyHash={latest.policyHash}
        />
      ) : null}

      <p
        className="text-[11px] leading-relaxed"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.4)" }}
      >
        Decision receipts cover schema neutrino.decision.v2: agent identity, asset metadata, market
        snapshot, xStocks public-API data when available, source-freshness flags, risk breakdown, policy,
        AI proposal, policy review, action, score, narration metadata.{" "}
        The reasonHash covers the full loop — AI proposal, policy review, and final on-chain commitment.{" "}
        keccak256(canonicalJson) = on-chain reasonHash.
      </p>
    </div>
  );
}

function Stat({ label, value, mono = false, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  const content = (
    <div
      className="rounded-xl p-4 block"
      style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-widest mb-1"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
      >
        {label}
      </p>
      <p
        className={`text-base font-semibold ${mono ? "text-sm" : ""}`}
        style={{ color: link ? "var(--bb-teal)" : "var(--bb-text)", fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
        {content}
      </a>
    );
  }
  return content;
}

function HashField({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-widest mb-1"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}
      >
        {label}
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs break-all transition-opacity hover:opacity-80"
          style={{ color: "var(--bb-teal)" }}
        >
          {value}
        </a>
      ) : (
        <p className="font-mono text-xs break-all" style={{ color: "rgba(138,148,166,0.6)" }}>
          {value}
        </p>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: "var(--bb-panel)", border: "1px dashed rgba(255,255,255,0.1)" }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: "var(--bb-text)" }}>{title}</p>
      <p className="text-sm" style={{ color: "var(--bb-muted)" }}>{body}</p>
    </div>
  );
}
