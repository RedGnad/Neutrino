# Neutrino

> Risk judgment layer for autonomous agents on Mantle xStocks / RWA.

**Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.**

Neutrino evaluates Mantle tokenized equities (TSLAx, NVDAx, SPYx, …) and yield-bearing assets (USDY, mETH) for market-hours, liquidity and basis risk, writes a canonical decision receipt on-chain (`reasonHash = keccak256(audit JSON)`), and routes capital toward documented Mantle RWA-yield rails (INIT Capital, Fluxion) when execution is appropriate. The deterministic rules engine decides; Claude Haiku 4.5 only narrates.

Built for the [Mantle Turing Test 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026) — Phase 2 "AI Awakening" — track **AI x RWA**.

---

## Live demo

- **Production**: https://neutrino-ebon.vercel.app *(redeploy after Vercel domain rebind)*
- **Source**: https://github.com/RedGnad/Neutrino
- **Mantle Mainnet contracts** *(both addresses identical to Sepolia thanks to CREATE determinism)*:
  - `RWAAgent` (ERC-8004 identity NFT): [`0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96`](https://mantlescan.xyz/address/0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96)
  - `RWADecisionLogger`: [`0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2`](https://mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2)
- **First mainnet decision batch** (block 94987254 – 94987269):

| Asset | Action | Tx |
|---|---|---|
| NVDAx | PAUSE | [`0xa09b1576…`](https://mantlescan.xyz/tx/0xa09b1576df102dbf2a062b72ca6097907a37b2c362e954de5bca4dd0e7ef51d8) |
| TSLAx | PAUSE | [`0x143fc5c2…`](https://mantlescan.xyz/tx/0x143fc5c2dea8db15ba689fd578d44a006cf9cc3dba725c90761a5ad5754b4f10) |
| SPYx | PAUSE | [`0xe27d79b5…`](https://mantlescan.xyz/tx/0xe27d79b5795bea80ab226a0a723674be662c08a8a186aaa47830d1886d588a59) |
| USDY | ALLOCATE | [`0xbd18bb0f…`](https://mantlescan.xyz/tx/0xbd18bb0fc2c8a49abd933c12a938ddaf3a50cfd7167720b1a57c04a436e70b95) |
| mETH | ALLOCATE | [`0x3f6f53f1…`](https://mantlescan.xyz/tx/0x3f6f53f1a14d4c3c30dfac4c19a7a9ba439105de4d27dab3d4257d23f1d711d7) |

---

## What ships today

- **Real on-chain decisions** on Mantle mainnet. Every run writes one `DecisionLogged` event per asset with a `reasonHash` that covers the full canonical audit JSON.
- **Verifiable receipts** — the `/agent-decision/[asset]` page reads the on-chain reason hash and lets you re-compute `keccak256` on the cached audit JSON to confirm a match.
- **Live freshness flags** in every result panel: market hours, reference prices (Twelve Data), xStock prices (Fluxion), LLM reasoning (Claude Haiku 4.5), on-chain write, on-chain execution. Stub vs live is shown, never hidden.
- **Two judge-ready scenarios** on the home page:
  - *Risky xStocks* (NVDAx / TSLAx / SPYx) — typically PAUSE outside market hours.
  - *Safe yield* (USDY / mETH) — typically ALLOCATE.
- **Optional real Fluxion / INIT execution** behind an opt-in flag; defaults to receipts-only so a demo never reverts on a missing pool.

## What's stubbed (and labelled as such)

- **xStock token addresses** on Mantle are not publicly indexed. The agent monitors xStocks via reference (Twelve Data) + market-hours awareness, but per-asset on-chain prices are stub until Mantle / Backed publishes the addresses.
- **Fluxion swap routing** is currently USDC → WMNT (the deepest AMM pool we can guarantee). A USDC → mETH route is wired and will swap once the pool is confirmed via `findPoolFee`.
- **INIT Capital `mintTo` ABI** has not been visually verified on a contract page; the wrapper supports three call shapes (default, with-amount, transfer-then-mint) so a smoke test can flip without rewriting the call site.

## Reproduce in 5 minutes

```bash
git clone https://github.com/RedGnad/Neutrino && cd Neutrino

# 1. Smart contracts (8/8 tests pass on Foundry, Solidity 0.8.27, EVM cancun)
cd contracts
forge build
forge test

# 2. Deploy to Mantle mainnet (requires .env with DEPLOYER_PRIVATE_KEY + MANTLE_MAINNET_RPC).
#    Same addresses as Sepolia thanks to CREATE determinism (~0.20 MNT cost).
set -a && source ../.env && set +a
forge script script/Deploy.s.sol --rpc-url mantle --broadcast

# 3. Web dashboard
cd ../web
cp ../.env.example .env.local   # fill in deployed addresses + Twelve Data + Anthropic keys
pnpm install
pnpm dev                        # → http://localhost:3000
```

Click **Run risky xStock scenario** on the home page. Within ~30s you'll have 3 PAUSE decisions on Mantle mainnet, each with a clickable Mantlescan link and a verifiable `reasonHash`. Visit `/agent-decision/NVDAx` and click **Verify hash** to confirm the on-chain hash matches `keccak256` of the cached audit JSON.

## Repo layout

```
neutrino/
├── SPEC.md              # full project spec — source of truth
├── contracts/           # Foundry — RWAAgent (ERC-8004) + RWADecisionLogger
│   ├── src/
│   ├── test/            # 8 tests, all passing
│   └── script/Deploy.s.sol
├── agent/               # Node/TS CLI — same risk engine, runnable standalone
└── web/                 # Next.js 16 — judge demo + verifier UI
    └── src/lib/agent/   # mirrored engine: scoring, decision, fetchers, on-chain wrappers
```

## Stack

- **Smart contracts**: Solidity 0.8.27 with Foundry (EVM `cancun`), deployed to Mantle mainnet.
- **Risk engine**: TypeScript, deterministic 5-component score (market hours, spread, liquidity, basis-vs-rolling-mean, volatility). LLM has zero influence on the action.
- **LLM narration**: Claude Haiku 4.5 via `@ai-sdk/anthropic` with prompt caching. Capped at ~120 output tokens. Costs ≈ $0.005 per agent run.
- **Reference prices**: Twelve Data (free tier, 8 req/min).
- **Execution venues**: Fluxion V3 SwapRouter + INIT Capital InitCore (Mantle mainnet).
- **Frontend**: Next.js 16 (App Router, Tailwind v4) on Vercel.
- **Verifier**: client-side `keccak256` via viem against the on-chain `reasonHash`.

## Decision receipt schema (`neutrino.decision.v1`)

```json
{
  "schema": "neutrino.decision.v1",
  "agentId": "1",
  "asset": { "symbol": "NVDAx", "address": "0x...", "kind": "tokenized_equity", "reference": "NVDA", "market": "NASDAQ" },
  "timestamp": 1778066400000,
  "sources": {
    "marketHours": "live",
    "referencePrice": "live",
    "xStockPrice": "stub",
    "onChainWrite": "live"
  },
  "snapshot": { "onChainPrice": 207.65, "referencePrice": 207.01, "spreadBps": 90, "volume24hUsd": 320000, "apy": null, "volatility24h": 0.55, "marketOpen": false },
  "breakdown": { "marketHoursPenalty": 250, "spreadPenalty": 200, "liquidityPenalty": 60, "basisPenalty": 0, "volatilityPenalty": 50, "total": 560 },
  "policy": { "name": "No after-hours risk", "blockAfterHoursEquity": true, "maxRiskForAllocate": 350, "fallbackYieldAsset": "USDY" },
  "action": "PAUSE",
  "riskScore": 560,
  "reason": "NASDAQ closed; spread 90 bps; market-hours penalty dominates the score…",
  "narration": { "model": "claude-haiku-4-5", "fromLlm": true }
}
```

`reasonHash` on-chain = `keccak256(JSON.stringify(payload))`. The serialization is byte-stable: same hash whether you re-compute it client-side, server-side, or with `cast keccak`.

## Why Mantle, why now

Mantle is closing the xStocks execution gap with the recent **Atomic RFQ** launch (Mantle / Bybit / Fluxion) and a growing institutional-style RWA stack — Ondo USDY, Mantle native mUSD, INIT Capital. As more autonomous agents touch this capital, the scarce layer is no longer execution — it's trustworthy autonomous judgment. Neutrino is that layer.

## Honest limitations (because the jury is on-chain analytics)

1. **xStock token addresses on Mantle are not in any public index.** The product database at `assets.backed.fi/legal-documentation/product-database` lists them by name without exposing addresses; Fluxion's developer skill repo lists USDC / USDT0 / WMNT / etc. but no xStocks. Until those are public, `xStockPrice` source stays `stub` in the receipt.
2. **Aave V3 on Mantle is not deployed.** The "$1B in 19 days" figure refers to overall Mantle TVL growth, not Aave specifically. Removed from the pitch.
3. **INIT Capital `mintTo` ABI** is not visually verified on Mantlescan. Wrapper has fallback modes; demo defaults to receipts-only so failure is impossible.
4. **Decision payloads** are cached per browser via `localStorage`. IPFS pinning is the next iteration so any third party can resolve a `reasonHash`.

## License

MIT.

## Built for Mantle Turing Test 2026

Track AI x RWA · submission deadline 15-16 June 2026 · jury covers AI infrastructure, on-chain analytics, institutional finance, VC.
