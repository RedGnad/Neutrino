import Link from 'next/link';
import { RunAgentButton } from '@/components/RunAgentButton';
import { NETWORK_LABEL } from '@/lib/onchain';

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            Neutrino · Mantle AI x RWA · {NETWORK_LABEL}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-950">
            Tokenized stocks trade 24/7.
            <br />
            Their underlying markets don&apos;t.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Neutrino is the risk-judgment layer for autonomous agents on Mantle. It evaluates
            tokenized equity exposure for market-hours, liquidity and basis risk, then writes a
            verifiable decision receipt on-chain and routes capital toward documented Mantle yield
            rails when execution is appropriate. The deterministic engine decides; the LLM only
            explains.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/market-map"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Market map
          </Link>
          <Link
            href="/proof"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            On-chain receipts
          </Link>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            Judge demo · pick a scenario
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
            Run the agent on {NETWORK_LABEL}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
            Each scenario walks the full pipeline: fetch a market snapshot, score risk
            deterministically, narrate via Claude Haiku 4.5, and write one canonical decision
            receipt per asset to <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">RWADecisionLogger</code>.
            The on-chain <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">reasonHash</code>{' '}
            equals <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">keccak256</code> of the
            full audit JSON — re-hash it locally on any decision page to confirm.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/40 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-rose-700">
                Risky scenario
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900">
                xStocks during after-hours
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Agent evaluates NVDAx / TSLAx / SPYx. Market-hours, liquidity and basis penalties
                push the action toward PAUSE under the active policy.
              </p>
            </div>
            <RunAgentButton
              scenario="risky-xstocks"
              label="Run risky xStock scenario"
              variant="primary"
              hint="Decisions only · ~30–60s · 3 on-chain receipts"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Safe scenario
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900">
                On-chain RWA / yield rails
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Agent evaluates USDY (Ondo T-bills) and mETH. No market-hours risk; the engine
                routes toward ALLOCATE.
              </p>
            </div>
            <RunAgentButton
              scenario="safe-yield"
              label="Run safe RWA scenario"
              variant="primary"
              hint="Decisions only · ~20–40s · 2 on-chain receipts"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-700">
                Execute on Mantle mainnet
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900">
                Real INIT Capital supply
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Runs the safe scenario and supplies 1 USDC to{' '}
                <a
                  href="https://dev.init.capital/contract-addresses/mantle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline-offset-2 hover:underline"
                >
                  INIT Capital
                </a>{' '}
                — a real RWA-yield rail, not a WMNT swap. Returns the real Mantlescan tx hash.
              </p>
            </div>
            <RunAgentButton
              scenario="safe-yield"
              executeOnChain
              label="Run + execute on Mantle"
              variant="execute"
              hint="Decisions + 1 USDC supply · uses ~1 USDC + gas"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <PrincipleCard
          title="Reasoning split from control"
          body="The deterministic risk engine picks the action. Claude Haiku 4.5 only narrates. Decisions stay reproducible from the on-chain receipt without LLM nondeterminism."
        />
        <PrincipleCard
          title="Source-freshness on every receipt"
          body="Every decision payload pins live / stub / simulated / n-a flags per signal. Nothing is hidden — judges see exactly which inputs were real at the moment of decision."
        />
        <PrincipleCard
          title="Verifiable by re-hash"
          body="The full audit JSON (snapshot, breakdown, policy, action, narration) is byte-stable. keccak256(payload) equals the bytes32 reasonHash emitted on Mantle."
        />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
          Why this matters for Mantle
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
          Risk judgment for the new xStocks / RWA execution stack
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
          Mantle is closing the xStocks execution gap with the recent{' '}
          <strong>Atomic RFQ launch</strong> (Mantle / Bybit / Fluxion) and a growing set of
          institutional-style RWA rails (USDY from Ondo, mUSD, INIT Capital pools). As more
          autonomous agents touch this capital, the scarce layer is no longer execution — it&apos;s
          trustworthy autonomous judgment. Neutrino is that layer: the agent that decides{' '}
          <em>when</em> the rails are safe to use, records the rationale on Mantle, and only then
          allows execution.
        </p>
      </section>
    </div>
  );
}

function PrincipleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
    </div>
  );
}
