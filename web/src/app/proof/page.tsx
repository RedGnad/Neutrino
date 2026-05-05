import {
  AGENT_ADDRESS,
  EXPLORER_ADDR,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  fetchRecentDecisions,
  resolveAsset,
  timeAgo,
} from '@/lib/onchain';

export const revalidate = 10;

export default async function ProofPage() {
  const decisions = LOGGER_ADDRESS ? await fetchRecentDecisions(50).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">On-chain proof</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every decision Neutrino takes is logged via{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">RWADecisionLogger</code> on
          Mantle Sepolia. Rows below are read live from the chain.
        </p>
      </div>

      <ContractCards />

      {!LOGGER_ADDRESS ? (
        <Empty
          title="Logger contract not configured"
          body="Set NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS in the web app environment to enable live reads."
        />
      ) : decisions.length === 0 ? (
        <Empty
          title="No decisions on-chain yet"
          body="Run the agent (pnpm --dir agent start) to write your first DecisionLogged event."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">When</th>
                <th className="px-4 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-right font-medium">Risk</th>
                <th className="px-4 py-3 text-right font-medium">Block</th>
                <th className="px-4 py-3 text-left font-medium">Reason hash</th>
                <th className="px-4 py-3 text-left font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {decisions.map((d) => {
                const asset = resolveAsset(d.assetAddress);
                return (
                  <tr key={d.txHash} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {timeAgo(d.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-950">{asset.symbol}</span>
                      {asset.reference ? (
                        <span className="ml-2 text-xs text-zinc-500">↔ {asset.reference}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-700">{d.action}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {d.riskScore}
                      <span className="text-zinc-400">/1000</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                      {d.blockNumber.toString()}
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-zinc-500">
                        {d.reasonHash.slice(0, 10)}…{d.reasonHash.slice(-4)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${EXPLORER_TX}/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {d.txHash.slice(0, 10)}…
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        {decisions.length > 0
          ? `Showing ${decisions.length} most recent decision${decisions.length === 1 ? '' : 's'} from RWADecisionLogger.`
          : null}
      </p>
    </div>
  );
}

function ContractCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LOGGER_ADDRESS ? (
        <ContractCard label="RWADecisionLogger" address={LOGGER_ADDRESS} />
      ) : null}
      {AGENT_ADDRESS ? <ContractCard label="RWAAgent (ERC-8004)" address={AGENT_ADDRESS} /> : null}
    </div>
  );
}

function ContractCard({ label, address }: { label: string; address: string }) {
  return (
    <a
      href={`${EXPLORER_ADDR}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-900">
        {address.slice(0, 10)}…{address.slice(-8)}
      </p>
      <p className="mt-1 text-xs text-emerald-700">View on Mantlescan ↗</p>
    </a>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
