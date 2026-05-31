import {
  AGENT_ADDRESS,
  EXPLORER_ADDR,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  NETWORK_LABEL,
  fetchRecentDecisions,
  resolveAsset,
  timeAgo,
} from "@/lib/onchain";
import { ReasonHashVerifier } from "@/components/ReasonHashVerifier";
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

export default async function ProofPage() {
  const decisions = LOGGER_ADDRESS
    ? await fetchRecentDecisions(50).catch(() => [])
    : [];
  const latest = decisions[0] ?? null;

  return (
    <div className="space-y-8" style={{ color: "var(--text)" }}>
      <section className="space-y-5">
        <SectionHeader
          eyebrow="On-chain proof registry"
          title="Verifiable decision receipts on Mantle."
          body={
            <>
              Every decision is logged through RWADecisionLogger on {NETWORK_LABEL}. Rows below
              are read live from the chain and link back to the receipt verifier.
            </>
          }
        />

        <MetricStrip
          columns={4}
          items={[
            { label: "Network", value: NETWORK_LABEL, tone: "green" },
            {
              label: "Logger",
              value: LOGGER_ADDRESS ? <HashText value={LOGGER_ADDRESS} chars={8} /> : "not configured",
              href: LOGGER_ADDRESS ? `${EXPLORER_ADDR}/${LOGGER_ADDRESS}` : undefined,
              tone: LOGGER_ADDRESS ? "gold" : "red",
            },
            {
              label: "Latest block",
              value: latest ? latest.blockNumber.toString() : "n/a",
              tone: latest ? "blue" : "slate",
            },
            { label: "Decisions shown", value: String(decisions.length), tone: decisions.length ? "green" : "slate" },
          ]}
        />
      </section>

      <ContractCards />

      <ReasonHashVerifier />

      {!LOGGER_ADDRESS ? (
        <Empty
          title="Logger contract not configured"
          body="Set NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS in the web app environment to enable live reads."
        />
      ) : decisions.length === 0 ? (
        <Empty
          title="No decisions on-chain yet"
          body="Run the agent from the home page to write the first DecisionLogged event."
        />
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="section-label">Registry rows</span>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Latest row refreshed {latest ? timeAgo(latest.timestamp) : "n/a"}.
              </p>
            </div>
            <StatusPill value="live read" tone="green">live read</StatusPill>
          </div>

          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  {["When", "Asset", "Action", "Risk", "Block", "Reason hash", "Tx", "Verify"].map((h, i) => (
                    <th key={h} className={i >= 3 && i <= 4 ? "text-right" : "text-left"}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => {
                  const asset = resolveAsset(d.assetAddress);
                  return (
                    <tr key={d.txHash}>
                      <td className="whitespace-nowrap text-xs" style={{ color: "var(--muted)" }}>
                        {timeAgo(d.timestamp)}
                      </td>
                      <td>
                        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {asset.symbol}
                        </span>
                        {asset.reference ? (
                          <span className="ml-2 text-xs" style={{ color: "rgba(144,126,108,0.56)" }}>
                            {asset.reference}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <StatusPill value={d.action}>{d.action}</StatusPill>
                      </td>
                      <td className="text-right">
                        <div className="ml-auto w-28">
                          <RiskBar value={d.riskScore} label />
                        </div>
                      </td>
                      <td className="text-right text-xs tabular-nums" style={{ color: "var(--muted)", fontFamily: "'Azeret Mono', monospace" }}>
                        {d.blockNumber.toString()}
                      </td>
                      <td>
                        <div className="flex min-w-[150px] items-center gap-2">
                          <HashText value={d.reasonHash} chars={10} />
                          <CopyButton value={d.reasonHash} label="copy" copiedLabel="copied" />
                        </div>
                      </td>
                      <td>
                        <HashText value={d.txHash} href={`${EXPLORER_TX}/${d.txHash}`} chars={10} />
                      </td>
                      <td>
                        <a
                          href={`/agent-decision/${asset.symbol}`}
                          className="text-xs font-semibold transition-opacity hover:opacity-80"
                          style={{ color: "var(--clear)", fontFamily: "'Azeret Mono', monospace" }}
                        >
                          Receipt
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section-ruled space-y-5">
        <SectionHeader
          eyebrow="What a judge can verify"
          title="Chain event, canonical JSON, and hash binding."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <ProofItem
            title="Event exists on-chain"
            body="DecisionLogged exposes tx hash, block number, caller, action, risk score, reasonHash, and policyHash."
          />
          <ProofItem
            title="Hash is binding"
            body="Open any receipt and verify keccak256(canonicalJson) against the on-chain reasonHash."
          />
          <ProofItem
            title="Sources are explicit"
            body="Inputs are marked live, stub, modelled, or n/a. Spread, depth, and volume are not claimed live."
          />
        </div>
      </section>
    </div>
  );
}

function ContractCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LOGGER_ADDRESS ? (
        <ContractCard label="RWADecisionLogger" address={LOGGER_ADDRESS} />
      ) : null}
      {AGENT_ADDRESS ? (
        <ContractCard label="RWAAgent" address={AGENT_ADDRESS} />
      ) : null}
    </div>
  );
}

function ContractCard({ label, address }: { label: string; address: string }) {
  return (
    <a href={`${EXPLORER_ADDR}/${address}`} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80">
      <ConsoleCard accent="gold" compact>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
          {label}
        </p>
        <p className="mt-1 font-mono text-sm" style={{ color: "var(--text)" }}>
          {address.slice(0, 10)}...{address.slice(-8)}
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--clear)" }}>
          View on Mantlescan
        </p>
      </ConsoleCard>
    </a>
  );
}

function ProofItem({ title, body }: { title: string; body: string }) {
  return (
    <ConsoleCard compact accent="slate">
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        {body}
      </p>
    </ConsoleCard>
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
