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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RWA market map</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Latest on-chain decision per asset. Read live from{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">RWADecisionLogger</code> on{' '}
          {NETWORK_LABEL}. Click an asset to see its full history.
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
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-left font-medium">Kind</th>
                <th className="px-4 py-3 text-left font-medium">Market</th>
                <th className="px-4 py-3 text-left font-medium">Last action</th>
                <th className="px-4 py-3 text-right font-medium">Last risk</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">When</th>
                <th className="px-4 py-3 text-left font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(({ asset, latest }) => {
                const status = statusFor(latest?.action ?? null, latest?.riskScore ?? null);
                return (
                  <tr key={asset.symbol} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agent-decision/${asset.symbol}`}
                        className="font-medium text-zinc-950 underline-offset-2 hover:underline"
                      >
                        {asset.symbol}
                      </Link>
                      {'reference' in asset && asset.reference ? (
                        <span className="ml-2 text-xs text-zinc-500">↔ {asset.reference}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {asset.kind === 'tokenized_equity' ? 'Tokenized equity' : 'Yield-bearing'}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {'market' in asset ? asset.market : 'on-chain'}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-700">
                      {latest?.action ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {latest ? (
                        <>
                          {latest.riskScore}
                          <span className="text-zinc-400">/1000</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {latest ? timeAgo(latest.timestamp) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <a
                          href={`${EXPLORER_TX}/${latest.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                        >
                          {latest.txHash.slice(0, 10)}…
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        {rows
          ? `${rows.filter((r) => r.latest !== null).length} of ${TRACKED_ASSETS.length} tracked assets have an on-chain decision.`
          : null}
      </p>
    </div>
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
