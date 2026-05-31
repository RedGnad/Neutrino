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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ asset, latest }) => {
            const category = asset.kind === "tokenized_equity" ? "Tokenized equity" : "Yield-bearing";
            const market = "market" in asset ? asset.market : "on-chain";
            const sourceQuality =
              asset.kind === "tokenized_equity"
                ? "live / stub / modelled flags"
                : "on-chain RWA signals";

            return (
              <ConsoleCard
                key={asset.symbol}
                accent={latest?.action === "ALLOCATE" ? "green" : latest?.action === "PAUSE" ? "amber" : "slate"}
                className="space-y-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/agent-decision/${asset.symbol}`}
                      className="text-xl font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "var(--text)" }}
                    >
                      {asset.symbol}
                    </Link>
                    {"reference" in asset && asset.reference ? (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        references {asset.reference}
                      </p>
                    ) : null}
                  </div>
                  <StatusPill value={latest?.action ?? "N/A"}>{latest?.action ?? "N/A"}</StatusPill>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniMetric label="Category" value={category} />
                  <MiniMetric label="Market" value={market} />
                  <MiniMetric label="Source quality" value={sourceQuality} wide />
                </div>

                <RiskBar value={latest?.riskScore ?? null} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[11px]" style={{ color: "rgba(144,126,108,0.62)", fontFamily: "'Azeret Mono', monospace" }}>
                    {latest ? timeAgo(latest.timestamp) : "no decision yet"}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/agent-decision/${asset.symbol}`} className="text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--clear)", fontFamily: "'Azeret Mono', monospace" }}>
                      Receipt
                    </Link>
                    {latest ? (
                      <HashText value={latest.txHash} href={`${EXPLORER_TX}/${latest.txHash}`} chars={8} />
                    ) : null}
                  </div>
                </div>
              </ConsoleCard>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MiniMetric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.55)", fontFamily: "'Azeret Mono', monospace" }}>
        {label}
      </p>
      <p className="mt-1 text-sm leading-snug" style={{ color: "rgba(242,232,213,0.76)" }}>
        {value}
      </p>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <ConsoleCard accent="amber" className="text-center">
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {body}
      </p>
    </ConsoleCard>
  );
}
