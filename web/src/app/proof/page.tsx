import { MOCK_DECISIONS } from '@/lib/mock-data';

const EXPLORER_BASE = 'https://sepolia.mantlescan.xyz/tx';

export default function ProofPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">On-chain proof</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every decision Neutrino takes is logged via{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">RWADecisionLogger</code> on
          Mantle. Each row links to the verified transaction.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">When</th>
              <th className="px-4 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-right font-medium">Risk</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {MOCK_DECISIONS.map((d) => (
              <tr key={d.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                  {timeAgo(d.timestamp)}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-950">{d.asset}</td>
                <td className="px-4 py-3 font-medium text-zinc-700">{d.action}</td>
                <td className="px-4 py-3 text-right tabular-nums">{d.riskScore}</td>
                <td className="max-w-md truncate px-4 py-3 text-zinc-600">{d.reason}</td>
                <td className="px-4 py-3">
                  <a
                    href={`${EXPLORER_BASE}/${d.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-emerald-700 underline-offset-2 hover:underline"
                  >
                    {d.txHash.slice(0, 10)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
