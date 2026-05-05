import Link from 'next/link';
import { MOCK_ASSETS, STATUS_STYLES } from '@/lib/mock-data';

export default function MarketMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RWA market map</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Real-time risk view across Mantle xStocks and yield-bearing assets. Click a row to see the
          agent&apos;s reasoning.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-left font-medium">Market</th>
              <th className="px-4 py-3 text-right font-medium">On-chain</th>
              <th className="px-4 py-3 text-right font-medium">Reference</th>
              <th className="px-4 py-3 text-right font-medium">Spread</th>
              <th className="px-4 py-3 text-right font-medium">24h vol</th>
              <th className="px-4 py-3 text-right font-medium">Risk</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {MOCK_ASSETS.map((row) => {
              const status = STATUS_STYLES[row.status];
              return (
                <tr key={row.symbol} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/agent-decision/${row.symbol}`}
                      className="font-medium text-zinc-950 underline-offset-2 hover:underline"
                    >
                      {row.symbol}
                    </Link>
                    {row.reference ? (
                      <span className="ml-2 text-xs text-zinc-500">↔ {row.reference}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.market === 'none' ? (
                      <span className="text-zinc-500">on-chain</span>
                    ) : (
                      <span>
                        {row.market}{' '}
                        <span
                          className={
                            row.marketOpen ? 'text-emerald-700' : 'text-zinc-500'
                          }
                        >
                          ({row.marketOpen ? 'open' : 'closed'})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ${row.onChainPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                    {row.referencePrice ? `$${row.referencePrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.spreadBps} bps</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ${formatUsd(row.volume24hUsd)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {row.riskScore}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.classes}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-700">{row.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}
