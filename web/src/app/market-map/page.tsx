import Link from 'next/link';
import {
  EXPLORER_TX,
  LOGGER_ADDRESS,
  NETWORK_LABEL,
  TRACKED_ASSETS,
  fetchLatestPerAsset,
  statusFor,
  timeAgo,
} from '@/lib/onchain';

export const revalidate = 10;

export default async function MarketMapPage() {
  const rows = LOGGER_ADDRESS
    ? await fetchLatestPerAsset().catch(() => null)
    : null;

  return (
    <div className="space-y-6" style={{ color: "var(--bb-text)" }}>
      {/* Header */}
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-2"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
        >
          RWA MARKET MAP
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Latest policy outcome per asset
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--bb-muted)" }}>
          Read live from{' '}
          <code
            className="rounded px-1.5 py-0.5 text-xs"
            style={{ background: "rgba(45,212,165,0.1)", color: "var(--bb-teal)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            RWADecisionLogger
          </code>{' '}
          on {NETWORK_LABEL}. Click any asset to view its full receipt history.
        </p>
      </div>

      {!LOGGER_ADDRESS ? (
        <Empty
          title="Logger contract not configured"
          body="Set NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS to enable live reads."
        />
      ) : rows === null ? (
        <Empty
          title="Could not read on-chain decisions"
          body={`The ${NETWORK_LABEL} RPC returned an error. Try again in a moment.`}
        />
      ) : (
        <div
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Asset", "Kind", "Market", "Last action", "Last risk", "Status", "When", "Tx"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest ${i === 3 || i === 4 ? "text-right" : "text-left"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)", background: "rgba(0,0,0,0.2)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ asset, latest }, idx) => {
                const status = statusFor(latest?.action ?? null, latest?.riskScore ?? null);
                const actionColor =
                  latest?.action === "PAUSE" ? "var(--bb-orange)"
                  : latest?.action === "ALLOCATE" ? "var(--bb-teal)"
                  : latest?.action ? "var(--bb-amber)"
                  : "var(--bb-muted)";

                const badgeBg =
                  status.label === 'ALLOCATE' ? 'rgba(45,212,165,0.12)'
                  : status.label === 'PAUSE' ? 'rgba(255,107,53,0.12)'
                  : status.label === 'HOLD' ? 'rgba(245,166,35,0.12)'
                  : 'rgba(255,255,255,0.05)';
                const badgeBorder =
                  status.label === 'ALLOCATE' ? 'rgba(45,212,165,0.3)'
                  : status.label === 'PAUSE' ? 'rgba(255,107,53,0.3)'
                  : status.label === 'HOLD' ? 'rgba(245,166,35,0.3)'
                  : 'rgba(255,255,255,0.1)';
                const badgeColor =
                  status.label === 'ALLOCATE' ? 'var(--bb-teal)'
                  : status.label === 'PAUSE' ? 'var(--bb-orange)'
                  : status.label === 'HOLD' ? 'var(--bb-amber)'
                  : 'var(--bb-muted)';

                return (
                  <tr
                    key={asset.symbol}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: idx < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/agent-decision/${asset.symbol}`}
                        className="text-sm font-semibold transition-opacity hover:opacity-80"
                        style={{ color: "var(--bb-text)" }}
                      >
                        {asset.symbol}
                      </Link>
                      {'reference' in asset && asset.reference ? (
                        <span className="ml-2 text-xs" style={{ color: "rgba(138,148,166,0.5)" }}>
                          ↔ {asset.reference}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--bb-muted)" }}>
                      {asset.kind === 'tokenized_equity' ? 'Tokenized equity' : 'Yield-bearing'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--bb-muted)" }}>
                      {'market' in asset ? asset.market : 'on-chain'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: actionColor, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {latest?.action ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {latest ? (
                        <>
                          {latest.riskScore}
                          <span style={{ color: "rgba(138,148,166,0.4)" }}>/1000</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-mono font-medium uppercase tracking-widest rounded px-2 py-0.5"
                        style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--bb-muted)" }}>
                      {latest ? timeAgo(latest.timestamp) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <a
                          href={`${EXPLORER_TX}/${latest.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs transition-opacity hover:opacity-80"
                          style={{ color: "var(--bb-teal)" }}
                        >
                          {latest.txHash.slice(0, 10)}… ↗
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows && (
        <p
          className="text-xs"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.4)" }}
        >
          {rows.filter((r) => r.latest !== null).length} of {TRACKED_ASSETS.length} tracked assets have an on-chain decision.
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
