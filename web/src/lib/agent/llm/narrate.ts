/**
 * LLM narration for agent decisions.
 *
 * Strict separation of concerns: the deterministic rules engine has *already*
 * produced the action and risk breakdown by the time we call this. The LLM is
 * only asked for natural-language prose on top of those facts. It cannot
 * change the decision. This keeps decisions auditable from the on-chain
 * reasonHash without LLM nondeterminism leaking into actions.
 *
 * Falls back to undefined on any error so callers can use their deterministic
 * reason string. Returns the model id used so the UI can surface it.
 */

import { generateText } from 'ai';
import type { Action, AssetMetadata, MarketSnapshot, RiskBreakdown, UserPolicy } from '../types';

export const NARRATION_MODEL = 'anthropic/claude-haiku-4-5';

export interface NarrateInput {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  breakdown: RiskBreakdown;
  action: Action;
  policy: UserPolicy;
}

export async function narrateDecision(input: NarrateInput): Promise<string | undefined> {
  if (!process.env.AI_GATEWAY_API_KEY) return undefined;

  const { meta, snapshot, breakdown, action, policy } = input;
  const facts = formatFacts(meta, snapshot, breakdown, action, policy);

  try {
    const { text } = await generateText({
      model: NARRATION_MODEL,
      prompt:
        `You are the narration layer of an on-chain RWA risk agent. Your only job is ` +
        `to explain — in 2 short sentences, plain English, no markdown, no bullet points — ` +
        `*why* the agent took the action it took, given the facts. Do not change the action ` +
        `or invent numbers. Use only the facts below.\n\n${facts}\n\n` +
        `Write the explanation as if a portfolio manager were reading it on a dashboard. ` +
        `Reference the most load-bearing risk drivers (highest penalty components). Avoid jargon ` +
        `unless it is precise (e.g. "basis", "spread"). 2 sentences max.`,
    });
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

function formatFacts(
  meta: AssetMetadata,
  snap: MarketSnapshot,
  bd: RiskBreakdown,
  action: Action,
  policy: UserPolicy,
): string {
  const lines: string[] = [];
  lines.push(`Asset: ${meta.symbol} (${meta.kind === 'tokenized_equity' ? 'tokenized equity' : meta.kind === 'yield_bearing' ? 'yield-bearing' : 'stable'})`);
  if (meta.reference) lines.push(`Underlying reference: ${meta.reference}`);
  if (meta.market && meta.market !== 'none') {
    lines.push(`Underlying market: ${meta.market} (currently ${snap.marketOpen ? 'open' : 'closed'})`);
  }
  lines.push(`On-chain price: ${snap.onChainPrice.toFixed(4)}`);
  if (snap.referencePrice !== undefined) {
    const dev = ((snap.onChainPrice - snap.referencePrice) / snap.referencePrice) * 100;
    lines.push(`Reference price: ${snap.referencePrice.toFixed(4)} (basis ${dev >= 0 ? '+' : ''}${dev.toFixed(3)}%)`);
  }
  lines.push(`Spread: ${snap.spreadBps} bps`);
  lines.push(`24h volume: $${snap.volume24hUsd.toLocaleString()}`);
  if (snap.apy !== undefined) lines.push(`APY: ${(snap.apy * 100).toFixed(2)}%`);
  lines.push(`Annualised vol: ${(snap.volatility24h * 100).toFixed(0)}%`);
  lines.push('');
  lines.push(`Risk breakdown (each 0..250 except volatility 0..150; total 0..1000):`);
  lines.push(`  - Market hours penalty: ${bd.marketHoursPenalty}`);
  lines.push(`  - Spread penalty: ${bd.spreadPenalty}`);
  lines.push(`  - Liquidity penalty: ${bd.liquidityPenalty}`);
  lines.push(`  - Basis penalty: ${bd.basisPenalty}`);
  lines.push(`  - Volatility penalty: ${bd.volatilityPenalty}`);
  lines.push(`  - Total risk score: ${bd.total}/1000`);
  lines.push('');
  lines.push(`Active policy: "${policy.name}" — block-after-hours-equity=${policy.blockAfterHoursEquity}, max-risk-for-allocate=${policy.maxRiskForAllocate}, fallback-yield=${policy.fallbackYieldAsset}`);
  lines.push(`Action chosen by the rules engine: ${action}`);
  return lines.join('\n');
}
