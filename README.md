# Neutrino

> Risk judgment layer for autonomous agents on Mantle xStocks / RWA.

**Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.**

Neutrino evaluates Mantle tokenized equities (TSLAx, NVDAx, SPYx, …) and yield-bearing assets (USDY, mETH) for market-hours, liquidity and basis risk, writes a canonical decision receipt on-chain (`reasonHash = keccak256(audit JSON)`), and — when policy allows — executes a safe Mantle-native allocation through Fluxion V3. The deterministic rules engine decides; Claude Haiku 4.5 only narrates.

**Honesty note (read before judging):** there is no *hidden* mock — every source is flagged `live` / `stub` / `n/a` in each receipt.

- **Live:** decision receipts on Mantle mainnet; the Fluxion V3 execution path; xStock **indicative price** and **trading-halt status** (xStocks public API, unauthenticated, verified 2026-05-21).
- **Modelled (flagged):** xStock order-book microstructure — spread, depth, 24h volume. The xStocks public API does not expose it, so the risk engine models it and the receipt marks those fields with `*`.
- **Not done (by design):** xStock **execution**. xChange / Atomic RFQ is an authenticated, issuer-direct channel — Neutrino *risk-evaluates* xStocks and routes execution only through the verified Mantle-native rail (Fluxion V3). Neutrino does not "trade xStocks".

Built for the [Mantle Turing Test 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026) — Phase 2 "AI Awakening" — track **AI x RWA**.

---

## Live demo

- **Live app**: **https://neutrino-fawn.vercel.app** — returns `200 OK`.
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

### Latest verified on-chain execution

A real `ALLOCATE` executed end-to-end on Fluxion V3 (Mantle mainnet). Demo round-trip — two real swaps, see the `EXECUTE_ROUNDTRIP` note below:

| Leg | Swap | Block | Tx |
|---|---|---|---|
| 1 | USDC → mETH | 95591939 | [`0xbd5f817b…`](https://mantlescan.xyz/tx/0xbd5f817be6387c2cd052c414d9ff1f79f7e0298e926644bdfe8562d8421f2a8a) |
| 2 | mETH → USDC *(demo unwind)* | 95591942 | [`0x5697e5a9…`](https://mantlescan.xyz/tx/0x5697e5a96f31c431d81cce936ae0a666f1d819427eddcc69d905a3f9fa2d3e6d) |

---

## DoraHacks Deployment Award — Submission Checklist

Mapping each "20 Project Deployment Award" requirement to direct, verifiable evidence.

| Requirement | Evidence | Status |
|---|---|---|
| Smart contract deployed on Mantle Mainnet | `RWADecisionLogger` @ [`0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2`](https://mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2) · `RWAAgent` @ [`0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96`](https://mantlescan.xyz/address/0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96) · both on Mantle Mainnet (chainId 5000) | ✅ |
| Contract verified on Mantle Explorer | Both contracts verified on **Sourcify** with "perfect" match (trustless, open verification). Sourcify links below. Mantlescan native verification pending API key. | ✅ |
| AI-powered callable on-chain function | `RWADecisionLogger.logDecision(agentId, asset, action, riskScore, reasonHash, policyHash)` — commits the AI/agent decision result on Mantle. See first proof tx: [`0xa09b1576…`](https://mantlescan.xyz/tx/0xa09b1576df102dbf2a062b72ca6097907a37b2c362e954de5bca4dd0e7ef51d8) | ✅ |
| Frontend demo publicly accessible | **https://neutrino-fawn.vercel.app** — live, returns 200 OK, no localhost dependency | ✅ |
| Deployment address in submission | Both addresses listed above and in this README | ✅ |
| Demo video ≥ 2 minutes | Script below — pending recording | ⚠️ |
| Open-source GitHub repo + README | **https://github.com/RedGnad/Neutrino** | ✅ |
| README: setup instructions | See "Reproduce in 5 minutes" section below | ✅ |
| README: architecture overview | See "Repo layout" and "Stack" sections below | ✅ |
| README: deployed contract addresses | `RWADecisionLogger`: `0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2` · `RWAAgent`: `0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96` | ✅ |

### AI-powered callable on-chain function — precise statement

The Neutrino AI/RWA agent runs **off-chain**. It evaluates live xStocks signals (price, trading-halt status) using a deterministic risk engine, generates a canonical decision receipt (JSON, schema `neutrino.decision.v2`), and commits the final `action`, `riskScore`, `reasonHash`, and `policyHash` on Mantle through `logDecision()`.

```
RWADecisionLogger.logDecision(
  uint256 agentId,     // ERC-8004 agent identity NFT id
  address asset,       // xStock or yield token contract address
  Action  action,      // PAUSE / ALLOCATE / HOLD / REDUCE / …
  uint16  riskScore,   // 0–1000 from deterministic engine
  bytes32 reasonHash,  // keccak256(canonical audit JSON)
  bytes32 policyHash   // keccak256(active policy JSON)
)
```

`reasonHash = keccak256(JSON.stringify(auditPayload))` — byte-stable, recomputable client-side or with `cast keccak`.

**LLM inference does not run on-chain.** Claude Haiku 4.5 only narrates the decision after it has been made by the deterministic engine. `llmControlsAction = false` in every receipt.

### Contract verification — status and links

Both contracts are verified on **Sourcify** with "perfect" match (byte-for-byte source ↔ bytecode):

| Contract | Sourcify link | Status |
|---|---|---|
| `RWADecisionLogger` | [repo.sourcify.dev / 5000 / 0xeA72…68Ef2](https://repo.sourcify.dev/contracts/full_match/5000/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2/) | ✅ perfect |
| `RWAAgent` | [repo.sourcify.dev / 5000 / 0x6eF0…4C96](https://repo.sourcify.dev/contracts/full_match/5000/0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96/) | ✅ perfect |

A "perfect" Sourcify match means the compiled bytecode from the source files is bit-identical to what is deployed on chain. Judges can download the source, recompile, and verify the hash themselves.

**Mantlescan native verification** (optional, shows green "Verified" badge in the Explorer UI) requires a `MANTLESCAN_API_KEY`. Get a free key at [mantlescan.xyz/myapikey](https://mantlescan.xyz/myapikey), add it to `.env`, then run:

```bash
cd contracts

# 1. RWADecisionLogger
forge verify-contract \
  --chain 5000 \
  --verifier etherscan \
  --verifier-url https://api.mantlescan.xyz/api \
  --etherscan-api-key $MANTLESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" "0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96") \
  0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2 \
  src/RWADecisionLogger.sol:RWADecisionLogger

# 2. RWAAgent
forge verify-contract \
  --chain 5000 \
  --verifier etherscan \
  --verifier-url https://api.mantlescan.xyz/api \
  --etherscan-api-key $MANTLESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" "0xdE7140BF0803257C493f26B588Dd68460f654860") \
  0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96 \
  src/RWAAgent.sol:RWAAgent
```

### Example proof transactions

| Asset | Action | riskScore | Tx |
|---|---|---|---|
| NVDAx | PAUSE | 560 | [`0xa09b1576…`](https://mantlescan.xyz/tx/0xa09b1576df102dbf2a062b72ca6097907a37b2c362e954de5bca4dd0e7ef51d8) |
| TSLAx | PAUSE | 510 | [`0x143fc5c2…`](https://mantlescan.xyz/tx/0x143fc5c2dea8db15ba689fd578d44a006cf9cc3dba725c90761a5ad5754b4f10) |
| SPYx | PAUSE | 530 | [`0xe27d79b5…`](https://mantlescan.xyz/tx/0xe27d79b5795bea80ab226a0a723674be662c08a8a186aaa47830d1886d588a59) |
| USDY | ALLOCATE | 0 | [`0xbd18bb0f…`](https://mantlescan.xyz/tx/0xbd18bb0fc2c8a49abd933c12a938ddaf3a50cfd7167720b1a57c04a436e70b95) |
| mETH | ALLOCATE | 0 | [`0x3f6f53f1…`](https://mantlescan.xyz/tx/0x3f6f53f1a14d4c3c30dfac4c19a7a9ba439105de4d27dab3d4257d23f1d711d7) |

The `/proof` page at [neutrino-fawn.vercel.app/proof](https://neutrino-fawn.vercel.app/proof) reads all `DecisionLogged` events live from the chain and renders them in a table with clickable Mantlescan links.

---

## What is on-chain vs off-chain

**On-chain (Mantle Mainnet):**
- Contract deployment — `RWAAgent` (ERC-8004 identity NFT) + `RWADecisionLogger`
- `logDecision()` call — one transaction per asset per agent run
- `action` — PAUSE / ALLOCATE / HOLD / REDUCE / …
- `riskScore` — 0–1000 deterministic score
- `reasonHash` — `bytes32 = keccak256(canonical audit JSON)`
- `policyHash` — `bytes32 = keccak256(active policy JSON)`
- `DecisionLogged` event log — queryable by any indexer
- Optional: Fluxion V3 execution swap transactions (USDC → mETH)

**Off-chain:**
- Live xStocks signal fetching (price, trading-halt status via xStocks public API)
- Deterministic risk engine — market hours, spread, liquidity, basis, volatility scoring
- LLM narration — Claude Haiku 4.5 explains the decision after the engine has made it
- Canonical audit JSON generation — `neutrino.decision.v2` schema
- `reasonHash` computation before on-chain submission
- Frontend visualization — Next.js on Vercel
- Reference price fetching — Twelve Data API
- Any modelled market microstructure (spread/depth/volume — flagged as `stub`)

**Not done by design:**
- xStock execution via xChange / Atomic RFQ (requires API key + registered wallet + auth quote — not a public endpoint)
- LLM inference on-chain
- IPFS pinning of canonical JSON (local server cache only; next iteration)

---

## What ships today

- **Real on-chain decisions** on Mantle mainnet. Every run writes one `DecisionLogged` event per asset with a `reasonHash` that covers the full canonical audit JSON (schema `neutrino.decision.v2`).
- **Live xStocks public-API integration.** For every tokenized equity the agent reads the issuer's **indicative price** (`/public/assets/{symbol}/price-data`) and the official **trading-halt status** (`/public/system/status/{symbol}`) — unauthenticated public endpoints, verified 2026-05-21. An `isMarketTradingHalted` / `isAtomicTradingHalted` flag forces `PAUSE`. xStock token contract addresses on Mantle are resolved from the same API and verified on-chain.
- **Verifiable local receipts** — after a run, the `/agent-decision/[asset]` page reads the on-chain reason hash and lets you re-compute `keccak256` on the audit JSON cached by that browser to confirm a match.
- **Live freshness flags** in every result panel: market hours, reference prices (Twelve Data), xStock price (xStocks API), xStock trading status (xStocks API), LLM reasoning (Claude Haiku 4.5), on-chain write, on-chain execution. `live` / `stub` / `n/a` is shown per signal, never hidden.
- **Two judge-ready scenarios** on the home page:
  - *Risky xStocks* (NVDAx / TSLAx / SPYx) — typically PAUSE outside market hours.
  - *Safe yield* (USDY / mETH) — typically ALLOCATE.
- **Optional real Fluxion execution** behind an opt-in button: the execution demo performs a real USDC → mETH allocation on Fluxion V3. Receipt-only runs remain the default for safe judging.

> ⚠️ **DEV NOTE — switch to production behaviour before the final cut-over.**
> The deployed demo runs the execution as a **round-trip** (USDC → mETH → mETH → USDC) so the shared demo wallet stays solvent across many judge clicks. Both legs are real on-chain Fluxion swaps. This is controlled by `EXECUTE_ROUNDTRIP` (defaults to `true`).
> **In production the agent must HOLD the mETH position** — a one-way allocation. Before the production cut-over: set `EXECUTE_ROUNDTRIP=false` (or flip the default in `web/src/app/api/run-agent/route.ts`, marked with a `TODO(prod)`), and size the swap from the decision rather than the fixed `EXECUTE_AMOUNT_USDC_BASE_UNITS`.

## What's modelled / not done (and labelled as such)

- **xStock order-book microstructure** — spread, depth, 24h volume — is **modelled**, not live. The xStocks public API exposes the indicative price and trading status (both live, see above) but not order-book depth. The risk engine models those fields and the receipt marks them with `*`. They are a secondary input; the dominant penalty for the risky scenario is market-hours / halt status, which is live.
- **xStock execution / xChange Atomic RFQ** is **not performed**. xChange RFQ is an authenticated, issuer-direct channel (API key + registered wallet + EIP-712 quote). Neutrino *risk-evaluates* xStocks and executes only through the verified Mantle-native rail (Fluxion V3 USDC → mETH). This is a deliberate execution-readiness guardrail, not a missing feature.
- **INIT Capital `mintTo` ABI** has not been visually verified on a contract page; the wrapper supports three call shapes (default, with-amount, transfer-then-mint) so a smoke test can flip without rewriting the call site. INIT is an experimental rail — the live execution path is Fluxion.

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

Click **Run risky xStock scenario** on the home page. Within ~30s you'll have 3 PAUSE decisions on Mantle mainnet, each with a clickable Mantlescan link. In the same browser, visit `/agent-decision/NVDAx` and click **Verify hash** to confirm the on-chain hash matches `keccak256` of the cached audit JSON.

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
- **Execution venues**: Fluxion V3 SwapRouter for the live USDC → mETH demo; INIT Capital InitCore wrapper kept as an experimental stable-yield rail.
- **Frontend**: Next.js 16 (App Router, Tailwind v4) on Vercel.
- **Verifier**: client-side `keccak256` via viem against the on-chain `reasonHash`.

## Decision receipt schema (`neutrino.decision.v2`)

```json
{
  "schema": "neutrino.decision.v2",
  "agentId": "1",
  "asset": { "symbol": "NVDAx", "address": "0xc845b2894dBddd03858fd2D643B4eF725fE0849d", "kind": "tokenized_equity", "reference": "NVDA", "market": "NASDAQ" },
  "timestamp": 1778066400000,
  "sources": {
    "marketHours": "live",
    "referencePrice": "live",
    "xStockPrice": "live",
    "xStockStatus": "live",
    "onChainWrite": "live"
  },
  "snapshot": { "onChainPrice": 220.36, "referencePrice": 220.1, "spreadBps": 90, "volume24hUsd": 320000, "apy": null, "volatility24h": 0.55, "marketOpen": false },
  "xstocks": { "indicativePriceUsd": 220.36, "priceSource": "xstocks-public-api", "marketTradingHalted": false, "atomicTradingHalted": false },
  "breakdown": { "marketHoursPenalty": 250, "spreadPenalty": 200, "liquidityPenalty": 60, "basisPenalty": 0, "volatilityPenalty": 50, "total": 560 },
  "policy": { "name": "No after-hours risk", "blockAfterHoursEquity": true, "maxRiskForAllocate": 350, "fallbackYieldAsset": "USDY" },
  "action": "PAUSE",
  "riskScore": 560,
  "reason": "NASDAQ closed; spread 90 bps; market-hours penalty dominates the score…",
  "narration": { "model": "claude-haiku-4-5", "fromLlm": true }
}
```

`snapshot.onChainPrice` is the live xStocks indicative quote; `snapshot.spreadBps` / `volume24hUsd` are modelled (the public API does not expose order-book depth). `sources` flags each signal `live` / `stub` / `n/a`. `reasonHash` on-chain = `keccak256(JSON.stringify(payload))` — byte-stable, so the same hash whether you re-compute it client-side, server-side, or with `cast keccak`.

## Why Mantle, why now

Mantle is closing the xStocks execution gap with the recent **Atomic RFQ** launch (Mantle / Bybit / Fluxion) and a growing institutional-style RWA stack — Ondo USDY, Mantle native mUSD, INIT Capital. As more autonomous agents touch this capital, the scarce layer is no longer execution — it's trustworthy autonomous judgment. Neutrino is that layer.

## Honest limitations (because the jury is on-chain analytics)

1. **xStock token addresses.** For NVDAx / TSLAx / SPYx the Mantle token addresses are resolved from the xStocks public API (`/public/assets/{symbol}`, `deployments[network=Mantle]`) and pinned only after on-chain `symbol()` / `decimals()` verification. Other xStocks stay disabled until verified the same way.
2. **xStock order-book microstructure is modelled.** The xStocks public API exposes the indicative price and trading-halt status (both `live` in the receipt) but not spread / depth / 24h volume. Those snapshot fields are modelled and flagged — they are a secondary input to the risk score.
3. **xStock execution (xChange / Atomic RFQ) is not performed.** xChange requires an API key generated in the Backed app, a registered wallet, and an EIP-712-signed `executeSwap()` on the AtomicSwap contract; its developer docs list Ethereum / Ink (EVM) and Solana, not Mantle. Neutrino treats RFQ execution as unavailable unless it has an authenticated, registered, executable route — that guardrail *is* the product. xStock execution is never simulated.
4. **Aave V3 on Mantle is not deployed.** The "$1B in 19 days" figure refers to overall Mantle TVL growth, not Aave specifically. Removed from the pitch.
5. **INIT Capital `mintTo` ABI** is not visually verified on Mantlescan. Wrapper has fallback modes; the live execution rail is Fluxion V3, INIT stays experimental.
6. **Decision payloads** are cached per browser via `localStorage`. IPFS pinning is the next iteration so any third party can resolve a `reasonHash`.

## Demo video script (2:00–2:30)

Use this as a screen recording checklist.

**[0:00–0:20] Open — the problem**
- Open [neutrino-fawn.vercel.app](https://neutrino-fawn.vercel.app)
- Say: *"Tokenized stocks like NVDAx and TSLAx now trade 24/7 on Mantle. Their underlying markets don't. Between 4 PM and 9:30 AM there is no price discovery, no liquidity — but the tokens keep trading. Autonomous agents need to know when not to act."*
- Point to the hero headline: *"The market closed at 4pm. The token didn't."*

**[0:20–0:50] Run the risky scenario**
- Click **Run risky scenario** (Scenario 01 — NVDAx / TSLAx / SPYx)
- Wait for the 3 on-chain receipts to appear in the live column
- Say: *"The deterministic engine reads live xStocks signals — price and trading-halt status — and scores risk. The LLM only narrates; it never controls the decision."*
- Point to the PAUSE badges appearing for all three equity tokens

**[0:50–1:10] Show the proof**
- Click **On-chain proofs** → `/proof`
- Point to the table: *"Every decision is written on Mantle through `RWADecisionLogger.logDecision()`. Here are the tx hashes — click any one to open Mantlescan."*
- Click one tx hash → Mantlescan opens, shows `DecisionLogged` event with `reasonHash`, `riskScore`, `action`

**[1:10–1:30] Verify the receipt**
- Click **Receipt →** for NVDAx → `/agent-decision/NVDAx`
- Click **Verify hash**
- Say: *"The `reasonHash` on Mantlescan equals `keccak256` of the full canonical audit JSON generated off-chain. The receipt is binding and reproducible."*
- Show the green `✓ VERIFIED MATCH` banner

**[1:30–1:45] Safe yield scenario**
- Navigate back → Run **safe yield** (Scenario 02 — USDY / mETH)
- Show ALLOCATE decisions with riskScore 0/1000
- Say: *"USDY and mETH carry no market-hours risk. The agent allocates."*

**[1:45–2:00] Contract on Mantlescan**
- Open `https://mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2`
- Show the contract page (ideally showing verified source; otherwise show the transaction history with `DecisionLogged` events)
- Say: *"Both contracts are deployed on Mantle Mainnet, chain ID 5000."*

**[2:00–2:20] Close**
- Return to homepage
- Say: *"Neutrino is the safety layer that tells autonomous RWA agents when capital should not move. Deterministic rules, verifiable receipts, honest about every data source. Built for Mantle."*

---

## License

MIT.

## Built for Mantle Turing Test 2026

Track AI x RWA · submission deadline 15-16 June 2026 · jury covers AI infrastructure, on-chain analytics, institutional finance, VC.
