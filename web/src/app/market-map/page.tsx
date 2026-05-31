import Link from "next/link";
import {
  EXPLORER_TX,
  LOGGER_ADDRESS,
  NETWORK_LABEL,
  TRACKED_ASSETS,
  fetchLatestPerAsset,
  timeAgo,
} from "@/lib/onchain";
import {
  ConsoleCard,
  HashText,
  MetricStrip,
  RiskBar,
  SectionHeader,
  StatusPill,
} from "@/components/Console";

export const revalidate = 10;

export default async function MarketMapPage() {
  const rows = LOGGER_ADDRESS
    ? await fetchLatestPerAsset().catch(() => null)
    : null;

  const populated = rows?.filter((r) => r.latest !== null).length ?? 0;

  return (
    <div className="space-y-8" style={{ color: "var(--text)" }}>
      <section className="space-y-5">
        <SectionHeader
          eyebrow="RWA market map"
          title="Latest policy outcome per asset."
          body={
            <>
              A compact dashboard of tracked assets, read from RWADecisionLogger on {NETWORK_LABEL}.
              Click any asset to inspect the full receipt history.
            </>
          }
        />
        <MetricStrip
          columns={3}
          items={[
            { label: "Network", value: NETWORK_LABEL, tone: "green" },
            { label: "Tracked assets", value: String(TRACKED_ASSETS.length), tone: "blue" },
            { label: "With decisions", value: `${populated}/${TRACKED_ASSETS.length}`, tone: populated ? "green" : "slate" },
          ]}
        />
      </section>

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
        <section className="asset-ledger">
          <div className="asset-ledger-head">
            {["Asset", "Category", "Outcome", "Risk", "Source quality", "Updated", "Receipt"].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {rows.map(({ asset, latest }) => {
            const category = asset.kind === "tokenized_equity" ? "Tokenized equity" : "Yield-bearing";
            const sourceQuality =
              asset.kind === "tokenized_equity"
                ? "live / stub / modelled flags"
                : "on-chain RWA signals";

            return (
              <div key={asset.symbol} className="asset-ledger-row">
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Asset</span>
                  <div>
                    <Link
                      href={`/agent-decision/${asset.symbol}`}
                      className="font-mono text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "var(--text)" }}
                    >
                      {asset.symbol}
                    </Link>
                    {"reference" in asset && asset.reference ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        references {asset.reference}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Category</span>
                  <span className="text-xs text-right sm:text-left" style={{ color: "var(--muted)" }}>
                    {category}
                  </span>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Outcome</span>
                  <StatusPill value={latest?.action ?? "N/A"}>{latest?.action ?? "N/A"}</StatusPill>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Risk</span>
                  <div className="w-28 sm:w-full">
                    <RiskBar value={latest?.riskScore ?? null} />
                  </div>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Source</span>
                  <span className="text-right text-xs sm:text-left" style={{ color: "var(--muted)" }}>
                    {sourceQuality}
                  </span>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Updated</span>
                  <span className="whitespace-nowrap text-xs" style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}>
                    {latest ? timeAgo(latest.timestamp) : "no decision yet"}
                  </span>
                </div>
                <div className="asset-ledger-cell">
                  <span className="asset-ledger-label">Receipt</span>
                  <div className="flex flex-wrap justify-end gap-3 sm:justify-start">
                    <Link href={`/agent-decision/${asset.symbol}`} className="text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--clear)", fontFamily: "'Azeret Mono', monospace" }}>
                      Receipt
                    </Link>
                    {latest ? (
                      <HashText value={latest.txHash} href={`${EXPLORER_TX}/${latest.txHash}`} chars={8} />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <ConsoleCard surface="ledger" accent="amber" className="text-center">
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {body}
      </p>
    </ConsoleCard>
  );
}
