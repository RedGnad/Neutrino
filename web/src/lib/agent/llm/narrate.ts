/**
 * LLM narration for agent decisions.
 *
 * Strict separation of concerns: the deterministic rules engine has *already*
 * produced the action and risk breakdown by the time we call this. The LLM is
 * only asked for natural-language prose on top of those facts. It cannot
 * change the decision. This keeps decisions auditable from the on-chain
 * reasonHash without LLM nondeterminism leaking into actions.
 *
 * Cost-conscious by design (target tested with a $2 budget):
 *   - Haiku 4.5: cheapest current Claude model.
 *   - System message cached with `cacheControl: ephemeral` so the static
 *     instructions are billed once at write rate, then ~10× cheaper on each
 *     subsequent call within ~5 minutes.
 *   - Output capped at 120 tokens (~2 short sentences).
 *   - Falls back to `undefined` on any error so callers use their
 *     deterministic reason string instead of failing the whole run.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { Action, AssetMetadata, MarketSnapshot, RiskBreakdown, UserPolicy } from '../types';

export const NARRATION_MODEL = 'claude-haiku-4-5';

const SYSTEM_INSTRUCTIONS =
  'You are the narration layer of an on-chain RWA risk agent. ' +
  'Your only job is to explain — in 2 short sentences, plain English, no markdown, ' +
  'no bullet points — *why* the agent took the action it took, given the facts. ' +
  'Do not change the action. Do not invent numbers; use only the facts in the user message. ' +
  'Write as if a portfolio manager were reading it on a dashboard. Reference the most ' +
  'load-bearing risk drivers (highest penalty components). Use precise vocabulary ' +
  '(basis, spread, liquidity) without unnecessary jargon. 2 sentences max.';

export interface NarrateInput {
  meta: AssetMetadata;
  snapshot: MarketSnapshot;
  breakdown: RiskBreakdown;
  action: Action;
  policy: UserPolicy;
}

function getApiKey(): string | undefined {
  return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || undefined;
}

export async function narrateDecision(input: NarrateInput): Promise<string | undefined> {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;

  const facts = formatFacts(input);
  const anthropic = createAnthropic({ apiKey });

  try {
    const { text } = await generateText({
      model: anthropic(NARRATION_MODEL),
      maxOutputTokens: 120,
      messages: [
        {
          role: 'system',
          content: SYSTEM_INSTRUCTIONS,
          providerOptions: {
            // Cache the static system prompt so subsequent narrations within
            // a ~5 min window read the cache (~10× cheaper) instead of
            // billing it as fresh input.
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        {
          role: 'user',
          content: facts,
        },
      ],
    });
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

function formatFacts({ meta, snapshot, breakdown, action, policy }: NarrateInput): string {
  const lines: string[] = [];
  lines.push(`Asset: ${meta.symbol} (${meta.kind === 'tokenized_equity' ? 'tokenized equity' : meta.kind === 'yield_bearing' ? 'yield-bearing' : 'stable'})`);
  if (meta.reference) lines.push(`Underlying reference: ${meta.reference}`);
  if (meta.market && meta.market !== 'none') {
    lines.push(`Underlying market: ${meta.market} (currently ${snapshot.marketOpen ? 'open' : 'closed'})`);
  }
  lines.push(`On-chain price: ${snapshot.onChainPrice.toFixed(4)}`);
  if (snapshot.referencePrice !== undefined) {
    const dev = ((snapshot.onChainPrice - snapshot.referencePrice) / snapshot.referencePrice) * 100;
    lines.push(`Reference price: ${snapshot.referencePrice.toFixed(4)} (basis ${dev >= 0 ? '+' : ''}${dev.toFixed(3)}%)`);
  }
  lines.push(`Spread: ${snapshot.spreadBps} bps`);
  lines.push(`24h volume: $${snapshot.volume24hUsd.toLocaleString()}`);
  if (snapshot.apy !== undefined) lines.push(`APY: ${(snapshot.apy * 100).toFixed(2)}%`);
  lines.push(`Annualised vol: ${(snapshot.volatility24h * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('Risk breakdown (each penalty 0..250 except volatility 0..150; total 0..1000):');
  lines.push(`  market_hours=${breakdown.marketHoursPenalty} spread=${breakdown.spreadPenalty} liquidity=${breakdown.liquidityPenalty} basis=${breakdown.basisPenalty} volatility=${breakdown.volatilityPenalty} total=${breakdown.total}`);
  lines.push('');
  lines.push(`Active policy: "${policy.name}" — block-after-hours-equity=${policy.blockAfterHoursEquity}, max-risk-for-allocate=${policy.maxRiskForAllocate}, fallback-yield=${policy.fallbackYieldAsset}`);
  lines.push(`Action chosen by the rules engine: ${action}`);
  return lines.join('\n');
}
