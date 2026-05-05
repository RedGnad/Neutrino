import { MOCK_VAULT_ALLOCATION } from '@/lib/mock-data';

export default function VaultPage() {
  const total = MOCK_VAULT_ALLOCATION.reduce((acc, a) => acc + a.usd, 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vault simulation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Current target allocation under the active policy.{' '}
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            simulation
          </span>{' '}
          — execution wires to a real Fluxion swap on Mantle Sepolia.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total AUM</p>
          <p className="text-2xl font-semibold tabular-nums">${total.toLocaleString()}</p>
        </div>
        <div className="mt-6 space-y-4">
          {MOCK_VAULT_ALLOCATION.map((a) => (
            <div key={a.symbol} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-900">{a.symbol}</span>
                <span className="tabular-nums text-zinc-700">
                  {a.pct}% — ${a.usd.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full bg-zinc-900"
                  style={{ width: `${a.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Active policy: <span className="font-medium text-zinc-700">No after-hours risk</span> · max
        risk for ALLOCATE: <span className="font-medium text-zinc-700">350</span> · fallback yield:{' '}
        <span className="font-medium text-zinc-700">USDY</span>
      </p>
    </div>
  );
}
