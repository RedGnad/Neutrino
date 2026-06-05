import { NextResponse } from 'next/server';
import { buildRegistrationFile, type NeutrinoNetwork } from '@/lib/agent/onchain/erc8004';

/**
 * Serves Neutrino's ERC-8004 agent registration file at /agent-card.json.
 * This is the `agentURI` the canonical IdentityRegistry token points to.
 * Because it is served from the same domain as the agent's other endpoints,
 * domain control is demonstrated here and no extra .well-known file is needed
 * (per the ERC-8004 endpoint-domain-verification note).
 */
export const dynamic = 'force-dynamic';

const DEFAULT_SITE = 'https://neutrino-fawn.vercel.app';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE;
  const network = (process.env.NEUTRINO_NETWORK ?? 'mantle') as NeutrinoNetwork;
  const agentId = Number(process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ?? '0');

  const file = buildRegistrationFile({ siteUrl, network, agentId });

  return NextResponse.json(file, {
    headers: {
      // Public, cacheable for a minute; tooling and verifiers re-fetch fresh.
      'cache-control': 'public, max-age=60',
    },
  });
}
