import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  EXPLORER_ADDR,
  EXPLORER_BLOCK,
  EXPLORER_TX,
  LOGGER_ADDRESS,
  fetchDecisionsForAsset,
  findTrackedAsset,
  statusFor,
  timeAgo,
} from '@/lib/onchain';

export const revalidate = 10;

interface Props {
  params: Promise<{ asset: string }>;
}

export default async function AgentDecisionPage({ params }: Props) {
  const { asset: symbol } = await params;
  const asset = findTrackedAsset(symbol);
  if (!asset) notFound();

  const decisions = LOGGER_ADDRESS ? await fetchDecisionsForAsset(asset.address, 20).catch(() => []) : [];
  const latest = decisions[0] ?? null;
  const status = statusFor(latest?.action ?? null, latest?.riskScore ?? null);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/market-map" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Back to market map
        </Link>
        <div className="mt-3 flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{asset.symbol}</h1>
          {'reference' in asset && asset.reference ? (
            <span className="text-sm text-zinc-500">references {asset.reference}</span>
          ) : null}
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.classes}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Kind" value={asset.kind === 'tokenized_equity' ? 'Tokenized equity' : 'Yield-bearing'} />
        <Stat label="Market" value={'market' in asset ? asset.market : 'on-chain'} />
        <Stat
          label="Token address"
          value={`${asset.address.slice(0, 8)}…${asset.address.slice(-4)}`}
          mono
        />
      </section>

      {latest ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Latest on-chain decision
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{latest.action}</p>
          <p className="mt-1 text-sm text-zinc-600">
            Risk score{' '}
            <span className="font-medium text-zinc-900">{latest.riskScore} / 1000</span> · written{' '}
            {timeAgo(latest.timestamp)} in{' '}
            <a
              href={`${EXPLORER_BLOCK}/${latest.blockNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline-offset-2 hover:underline"
            >
              block {latest.blockNumber.toString()}
            </a>
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Reason hash (off-chain JSON)</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-700">{latest.reasonHash}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Policy hash</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-700">{latest.policyHash}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Caller</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-700">
                <a
                  href={`${EXPLORER_ADDR}/${latest.caller}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline-offset-2 hover:underline"
                >
                  {latest.caller.slice(0, 10)}…{latest.caller.slice(-6)}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Tx</dt>
              <dd className="mt-1 font-mono text-xs">
                <a
                  href={`${EXPLORER_TX}/${latest.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline-offset-2 hover:underline"
                >
                  {latest.txHash.slice(0, 16)}…
                </a>
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <Empty
          title="No on-chain decision for this asset yet"
          body="Run the agent (`pnpm --dir agent start`) to generate the first decision."
        />
      )}

      {decisions.length > 1 ? (
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Decision history ({decisions.length})
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">When</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-right font-medium">Risk</th>
                <th className="px-4 py-3 text-right font-medium">Block</th>
                <th className="px-4 py-3 text-left font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {decisions.map((d) => (
                <tr key={d.txHash} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600">{timeAgo(d.timestamp)}</td>
                  <td className="px-4 py-3 font-medium text-zinc-700">{d.action}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {d.riskScore}
                    <span className="text-zinc-400">/1000</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                    {d.blockNumber.toString()}
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
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <p className="text-xs text-zinc-500">
        Off-chain explanations: the JSON behind <code className="rounded bg-zinc-100 px-1 py-0.5">reasonHash</code>{' '}
        contains the full risk breakdown and LLM-narrated rationale. It will be pinned to IPFS in
        the next iteration so any third party can verify the hash.
      </p>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-zinc-950 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
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
