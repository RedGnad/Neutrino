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

export const revalidate = 10;

export default async function ProofPage() {
  const decisions = LOGGER_ADDRESS
    ? await fetchRecentDecisions(50).catch(() => [])
    : [];

  return (
    <div className="space-y-6" style={{ color: "var(--bb-text)" }}>
      {/* Header */}
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-widest mb-2"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
        >
          ON-CHAIN PROOF REGISTRY
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Verifiable decision receipts — Mantle mainnet
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--bb-muted)" }}>
          Every decision Neutrino takes is logged via{" "}
          <code
            className="rounded px-1.5 py-0.5 text-xs"
            style={{ background: "rgba(45,212,165,0.1)", color: "var(--bb-teal)", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            RWADecisionLogger
          </code>{" "}
          on {NETWORK_LABEL}. Rows below are read live from the chain.
        </p>
      </div>

      {/* Contract addresses */}
      <ContractCards />

      {!LOGGER_ADDRESS ? (
        <Empty
          title="Logger contract not configured"
          body="Set NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS in the web app environment to enable live reads."
        />
      ) : decisions.length === 0 ? (
        <Empty
          title="No decisions on-chain yet"
          body="Run the agent from the home page or via pnpm dev to write the first DecisionLogged event."
        />
      ) : (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--bb-border)", background: "var(--bb-panel)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["When", "Asset", "Action", "Risk", "Block", "Reason hash", "Tx", "Verify"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-medium uppercase tracking-widest ${i >= 3 && i <= 4 ? "text-right" : "text-left"}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)", background: "rgba(0,0,0,0.2)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, idx) => {
                const asset = resolveAsset(d.assetAddress);
                const actionColor =
                  d.action === "PAUSE" ? "var(--bb-orange)"
                  : d.action === "ALLOCATE" ? "var(--bb-teal)"
                  : "var(--bb-amber)";
                return (
                  <tr
                    key={d.txHash}
                    style={{ borderBottom: idx < decisions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: "var(--bb-muted)" }}>
                      {timeAgo(d.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: "var(--bb-text)" }}>
                        {asset.symbol}
                      </span>
                      {asset.reference ? (
                        <span className="ml-2 text-xs" style={{ color: "rgba(138,148,166,0.5)" }}>
                          ↔ {asset.reference}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: actionColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {d.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.riskScore}
                      <span style={{ color: "rgba(138,148,166,0.4)" }}>/1000</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: "var(--bb-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.blockNumber.toString()}
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs" style={{ color: "rgba(138,148,166,0.5)" }}>
                        {d.reasonHash.slice(0, 10)}…{d.reasonHash.slice(-4)}
                      </code>
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
                    <td className="px-4 py-3">
                      <a
                        href={`/agent-decision/${asset.symbol}`}
                        className="text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: "var(--bb-teal)", fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        Receipt →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {decisions.length > 0 && (
        <p className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.4)" }}>
          Showing {decisions.length} most recent decision{decisions.length === 1 ? "" : "s"} from RWADecisionLogger.
        </p>
      )}

      {/* What a judge can verify */}
      <section
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-teal)" }}
        >
          WHAT A JUDGE CAN VERIFY
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <ProofItem
            title="Event exists on-chain"
            body="DecisionLogged is read live from Mantle — tx hash, block number, caller, action, risk score."
          />
          <ProofItem
            title="Hash is binding"
            body="Open any receipt, click Verify hash — keccak256(canonicalJson) must equal the on-chain reasonHash."
          />
          <ProofItem
            title="Sources are explicit"
            body="Every field in the payload is marked live, stub, simulated or n/a. Spread/depth/volume are modelled, never claimed live."
          />
        </div>
      </section>
    </div>
  );
}

function ContractCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LOGGER_ADDRESS ? (
        <ContractCard label="RWADecisionLogger" address={LOGGER_ADDRESS} />
      ) : null}
      {AGENT_ADDRESS ? (
        <ContractCard label="RWAAgent (ERC-8004)" address={AGENT_ADDRESS} />
      ) : null}
    </div>
  );
}

function ContractCard({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={`${EXPLORER_ADDR}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl p-4 block transition-colors"
      style={{ background: "var(--bb-panel)", border: "1px solid var(--bb-border)" }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-widest mb-1"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
      >
        {label}
      </p>
      <p className="font-mono text-sm" style={{ color: "var(--bb-text)" }}>
        {address.slice(0, 10)}…{address.slice(-8)}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--bb-teal)" }}>
        View on Mantlescan ↗
      </p>
    </a>
  );
}

function ProofItem({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--bb-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {title}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--bb-muted)" }}>{body}</p>
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
