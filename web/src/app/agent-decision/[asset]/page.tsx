import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MOCK_ASSETS, STATUS_STYLES } from '@/lib/mock-data';

interface Props {
  params: Promise<{ asset: string }>;
}

export default async function AgentDecisionPage({ params }: Props) {
  const { asset } = await params;
  const row = MOCK_ASSETS.find((r) => r.symbol === asset);
  if (!row) notFound();

  const status = STATUS_STYLES[row.status];
  const breakdown = mockBreakdown(row.riskScore);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/market-map" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to market map
        </Link>
        <div className="mt-3 flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{row.symbol}</h1>
          {row.reference ? (
            <span className="text-sm text-zinc-500">references {row.reference}</span>
          ) : null}
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.classes}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="On-chain price" value={`$${row.onChainPrice.toFixed(2)}`} />
        <Stat
          label="Reference price"
          value={row.referencePrice ? `$${row.referencePrice.toFixed(2)}` : '—'}
        />
        <Stat
          label={row.market === 'none' ? 'Market' : `${row.market} session`}
          value={row.market === 'none' ? 'on-chain only' : row.marketOpen ? 'open' : 'closed'}
        />
        <Stat label="Spread" value={`${row.spreadBps} bps`} />
        <Stat label="24h volume" value={`$${formatUsd(row.volume24hUsd)}`} />
        <Stat
          label="APY"
          value={row.apy !== undefined ? `${(row.apy * 100).toFixed(2)}%` : '—'}
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Decision</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{row.action}</p>
        <p className="mt-1 text-sm text-zinc-600">
          Risk score <span className="font-medium text-zinc-900">{row.riskScore} / 1000</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{row.reason}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Risk breakdown</p>
        <div className="mt-4 space-y-3">
          {breakdown.map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-zinc-700">{b.label}</span>
                <span className="font-medium tabular-nums text-zinc-900">{b.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full bg-zinc-900"
                  style={{ width: `${(b.value / 250) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{value}</p>
    </div>
  );
}

function mockBreakdown(total: number) {
  const f = total / 1000;
  return [
    { label: 'Market hours', value: Math.round(250 * Math.min(1, f * 1.4)) },
    { label: 'Spread', value: Math.round(200 * Math.min(1, f * 1.0)) },
    { label: 'Liquidity', value: Math.round(200 * Math.min(1, f * 0.9)) },
    { label: 'Basis', value: Math.round(200 * Math.min(1, f * 0.6)) },
    { label: 'Volatility', value: Math.round(150 * Math.min(1, f * 0.7)) },
  ];
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}
