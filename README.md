# Neutrino

> Market-aware AI risk-allocation agent for Mantle tokenized RWAs.

**Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.**

Neutrino monitors Mantle xStocks (TSLAx, NVDAx, SPYx, ...) and yield-bearing assets (USDY, mETH), detects liquidity, basis, and market-hours risk, then reallocates or pauses exposure with every decision recorded on-chain via ERC-8004 agent identity.

Built for the [Mantle Turing Test 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026) — Phase 2 "AI Awakening" — track **AI x RWA**.

## Repo layout

```
neutrino/
├── SPEC.md              # Project spec — source of truth
├── contracts/           # Foundry — RWAAgent (ERC-8004) + RWADecisionLogger
├── agent/               # Node/TS — fetch loop, risk engine, decision writer
└── web/                 # Next.js + shadcn — 4 dashboard screens
```

## Quick start

```bash
# Contracts
cd contracts && forge build && forge test

# Agent service
cd agent && pnpm install && pnpm dev

# Web dashboard
cd web && pnpm install && pnpm dev
```

## Stack

- **Smart contracts**: Solidity, Foundry, deployed to Mantle Sepolia (then mainnet)
- **Agent**: TypeScript / Node, deterministic risk engine + LLM (via Vercel AI Gateway) for natural-language explanations
- **Frontend**: Next.js 15 + shadcn/ui + Tailwind
- **Reference price feed**: Twelve Data or Alpaca (free tier)
- **xStocks data**: Fluxion DEX (on-chain) + Mantle RPC

## Status

Day 1 — scaffolding. See [`SPEC.md`](./SPEC.md) for full spec, kill-gates, and risks.

## License

MIT (or TBD).
