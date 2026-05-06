import Link from 'next/link';
import { RunAgentButton } from '@/components/RunAgentButton';
import { NETWORK_LABEL } from '@/lib/onchain';

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">Neutrino</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-950">
            Tokenized stocks trade 24/7.
            <br />
            Their underlying markets don&apos;t.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Neutrino is a market-aware AI risk-allocation agent for Mantle RWAs. It monitors xStocks
            and yield-bearing assets, detects liquidity, basis, and market-hours risk, and reallocates
            or pauses exposure with every decision recorded on-chain via ERC-8004 agent identity.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/market-map"
            className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open the dashboard
          </Link>
          <Link
            href="/proof"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            View on-chain proof
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Live demo</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">Run the agent on-chain</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-zinc-600">
          Trigger one full decision cycle. The agent scores all five tracked assets, picks an
          action under the active policy, and writes each decision to{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">RWADecisionLogger</code> on {NETWORK_LABEL}. Pipeline freshness flags appear with the result so you can see exactly which inputs were live.
        </p>
        <RunAgentButton />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Market-hours aware',
            body: 'NYSE/NASDAQ schedule is a first-class signal. xStocks get paused when their underlying is closed, on policy.',
          },
          {
            title: 'Basis as deviation, not arb',
            body: 'Rolling-mean basis with 2σ thresholds — xStocks are tracker certificates, not synthetic equity.',
          },
          {
            title: 'Every decision on-chain',
            body: 'Action, risk score, reason hash, policy hash. Auditable from the Mantle explorer.',
          },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border border-zinc-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-zinc-950">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{card.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
