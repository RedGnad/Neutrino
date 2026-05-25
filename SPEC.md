# Neutrino

> Market-aware AI risk-allocation agent for Mantle tokenized RWAs.

**Pitch (one-liner):** Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.

**Long pitch:** Neutrino is an AI risk-allocation agent for Mantle RWAs. It monitors tokenized equities (xStocks) and yield-bearing assets (USDY, mETH), detects liquidity, basis and market-hours risk, then **executes** real on-chain reallocations on Fluxion + INIT Capital, with every decision and execution recorded on-chain.

---

## Status (2026-05-07) — Phase 2: mainnet pivot

After deep ecosystem research (see "Phase 2 plan" section below), the project is pivoting from Mantle Sepolia (decision-log only) to **Mantle mainnet with a real execution layer**.

**What changed and why:**
- The original "swap on Fluxion Sepolia" plan in R3 is unbuildable: Fluxion + INIT + Ondo USDY only have documented mainnet deployments; their Sepolia counterparts are not in any official dev resource.
- Aave V3 on Mantle is **not deployed** — the "$1B in 19 days" referenced earlier was Mantle global TVL growth, not Aave-specific. Removed from the pitch.
- xStock individual ERC-20 addresses are **not publicly indexed** (Backed product database, Fluxion skill repo, Mantlescan public search all silent on `TSLAx`/`NVDAx`/etc. addresses on Mantle). Pivot the demo execution to **mETH / USDC / USDY / mUSD** which are all fully documented.
- ERC-8004 is **auto-issued by the hackathon harness** (not a hard implementation requirement). Optional add: publish a static `agent-card.json` per the EIP for evaluator discoverability.

**New execution layer:**
- **ALLOCATE / REDUCE** → Fluxion V3 SwapRouter (`exactInputSingle` USDC ↔ mETH or USDC ↔ WMNT)
- **MOVE_TO_STABLE_YIELD** → swap to USDC on Fluxion if needed, then supply INIT Capital USDY pool (real Ondo T-bill yield exposure)
- **HOLD / PAUSE** → no-op, decision still logged
- **REQUIRE_HUMAN_CONFIRMATION** → emit on-chain event, halt auto-execution

**Demo loop becomes:** agent observes USDY APY + mETH spread → ALLOCATE swap on Fluxion → simulated volatility spike → MOVE_TO_STABLE_YIELD = real swap + INIT supply → tx hashes visible on Mantlescan.

---

## Context

- **Hackathon:** Mantle Turing Test 2026 — Phase 2 "AI Awakening"
- **Submission deadline:** 15-16 June 2026 (target submission: 14 June, J-1 buffer)
- **Track principal:** AI x RWA
- **Track secondaire:** AI DevTools (uniquement si on package le scoring engine en SDK/API)
- **Track tertiaire:** Agentic Wallets & Economy (uniquement si l'agent pilote une vraie allocation/vault)
- **Pitch principal reste:** Automated risk management for Mantle RWAs. Pas "guardrails", pas "wallet", pas "dashboard".

---

## Pourquoi cette direction (data-driven)

1. **Le track AI x RWA demande explicitement** des dynamic yield strategies + automated risk management pour des actifs comme USDY et mETH, avec on-chain logging des décisions et identité ERC-8004 des agents. Fit littéral, pas inventé.
2. **Mantle pousse fort RWA / institutional liquidity** : Nansen positionne Mantle comme distribution layer pour TradFi/RWA ; Mantle TVL a passé $1B en 19 jours sur l'ensemble de l'écosystème (mETH + INIT Capital + xStocks). *Note: Aave V3 sur Mantle est encore en gouvernance, pas déployé.*
3. **Mantle Global Hackathon 2025 confirme l'éditorial** : RWA/RealFi 22.21% > DeFi 21.79% > AI > Infra > GameFi parmi les 519 submissions.
4. **xStocks = wedge frais et Mantle-native** : intégration avec Bybit + BackedFi + Flowdesk + Fluxion (avril 2026), actifs TSLAx, NVDAx, AAPLx, METAx, GOOGLx, MSTRx, HOODx, SPYx, QQQx, CRCLx.
5. **Le risque est réel, pas narratif** : xStocks peuvent diverger du sous-jacent en cas de faible liquidité ; les halts TradFi cassent la référence.
6. **Track Consumer & Viral DApps sera saturé** (~75% des participants). AI x RWA est le track le moins crowded sur les 6.

---

## Produit

### 3 familles d'actifs surveillés

**1. Tokenized equities (xStocks)** — TSLAx, NVDAx, AAPLx, SPYx, QQQx
- Problème : tradables 24/7, sous-jacent TradFi avec horaires, halts, spread, référence parfois fragile.

**2. Yield-bearing / RWA-like** — USDY, mETH, USDe / sUSDe (si intégrable), USDC / USDT0 (cash fallback)
- Problème : éviter de confondre APY élevé et risque faible.

**3. Mantle DeFi venues** — **Fluxion V3 SwapRouter** (mainnet, addresses publiques) + **INIT Capital** (mainnet, USDY pool natif). Skip Aave (not deployed), Lendle (winding down), Byreal (Solana-native, not Mantle).

### Boucle produit

1. **L'utilisateur choisit un profil** : `Conservative RWA`, `Balanced RWA`, `Growth xStocks`, `No after-hours risk`, `Yield-first`.

2. **L'agent scanne** chaque actif :
   - market open / closed
   - spread
   - liquidité
   - divergence avec référence
   - volatilité récente
   - risque de halt / référence indisponible
   - APY (yield assets)
   - exposition portefeuille
   - score final

3. **L'agent décide** : `ALLOCATE` / `HOLD` / `REDUCE` / `PAUSE` / `MOVE_TO_STABLE_YIELD` / `REQUIRE_HUMAN_CONFIRMATION`

4. **Décision loggée on-chain** :
   ```solidity
   RWADecisionLogged(
     agentId,        // ERC-8004 token id
     asset,
     action,
     riskScore,
     reasonHash,     // keccak256 du JSON explanation off-chain
     policyHash,     // keccak256 du profil utilisateur
     timestamp
   )
   ```

5. **Dashboard rend la décision lisible** :
   ```
   Asset: NVDAx
   Market status: US market closed
   Liquidity: medium
   Spread: elevated
   Basis risk: high
   Verdict: PAUSE
   Action: Move allocation to USDY / stable yield until market reopens
   Proof: Mantle decision receipt
   ```

### Risk score V1 (déterministe, pas ML)

```
risk = marketHoursPenalty
     + spreadPenalty
     + liquidityPenalty
     + basisPenalty           // déviation vs MA(7j), seuil 2σ — pas |TSLAx - TSLA|
     + volatilityPenalty
```

Le moteur de règles décide. Le LLM (via AI Gateway) explique en langage naturel.

---

## Stack technique

| Couche | Choix |
|---|---|
| Frontend | Next.js 16 + Tailwind v4. Design **institutionnel**, pas cyberpunk. |
| Smart contracts | Solidity, Foundry. **Mantle mainnet** (Phase 2). |
| Agent | Node.js (TypeScript) — fetch loop + risk engine + decision writer + execution layer |
| LLM | AI SDK v6 + `@ai-sdk/anthropic` (Claude Haiku 4.5, prompt caching) |
| Reference price feed | **Twelve Data** (free tier, live) |
| Asset / pool prices | Fluxion V3 QuoterV2 + Mantle mainnet RPC |
| Execution venue | Fluxion V3 SwapRouter + INIT Capital InitCore |
| Market hours | Static NYSE/NASDAQ schedule, NY tz |

---

## Smart contracts (scope simplifié — 2 contrats, pas 4)

### `RWAAgent.sol`
- Mint ERC-8004 identity NFT
- Stocke le pointeur vers l'agent card off-chain (IPFS ou URL signée)
- Owner / endpoints / payment address

### `RWADecisionLogger.sol`
- Event-only contract (super léger, gas-cheap sur Mantle)
- `logDecision(agentId, asset, action, riskScore, reasonHash, policyHash)`
- Pas de storage, juste des events → indexable, immuable

**Volontairement supprimés du scope :**
- ❌ `RWAPolicyRegistry` → policies en JSON off-chain, on log juste leur `keccak256` hash
- ❌ `MockRWAVault` → on remplace par un **vrai swap Fluxion testnet** (cf. ci-dessous)

---

## 4 écrans frontend

1. `/market-map` — RWA Market Map. Actifs avec statut `Safe / Watch / Risk / Paused`.
2. `/agent-decision/:asset` — Pourquoi l'agent recommande quoi (LLM explanation rendered).
3. `/vault` — Allocation actuelle (xStocks / USDY / mETH / stable fallback) + simulation.
4. `/proof` — Decision receipts + liens explorer Mantle.

---

## Démo 90 secondes — script

| Scène | Contenu |
|---|---|
| 1 | Dashboard Neutrino, 5 actifs : NVDAx, TSLAx, SPYx, USDY, mETH |
| 2 | User choisit profil : *"Growth xStocks, but avoid after-hours liquidity risk"* |
| 3 | Agent analyse NVDAx → verdict : *"PAUSE — US market closed, liquidity thin, basis risk elevated"* |
| 4 | Agent propose : *"Move idle allocation to USDY until market reopens"* |
| 5 | Décision enregistrée sur Mantle → juge clique sur receipt |
| 6 | Deuxième cas : marché ouvert, spread correct → *"ALLOCATE 10% to SPYx"* |
| 7 | Phrase finale : *"Neutrino makes tokenized assets safer to use by giving Mantle agents market-aware risk judgment."* |

---

## Risques identifiés + mitigations

### R1 — Volume xStocks réel sur Fluxion = inconnu (CRITIQUE)
Si NVDAx fait < $100K/jour, le signal liquidité sera toujours actif → démo plate.
**Mitigation J-1** : ouvrir Fluxion mainnet, vérifier volume 24h sur TSLAx / SPYx / NVDAx. Si faible, repondérer le risk score : **spread + basis** primaires, liquidité secondaire.

### R2 — Basis risk naïf = piège quant
xStocks sont des collateralized tracker certificates Swiss DLT Act → la basis dérive légitimement (fees, redemption, premium juridique). `basis = TSLAx - TSLA` flag des faux positifs.
**Mitigation** : basis = déviation par rapport à **moyenne mobile rolling 7j**, seuil d'alerte à **2σ**. Ce n'est pas du arb naïf, c'est de la statistique honnête.

### R3 — MockRWAVault = red flag pour juges institutionnels
Track AI x RWA jugée par BGA / Animoca / Hashed côté RWA. Mock vault = "ils n'ont pas réussi à intégrer".
**Mitigation Phase 2** : pas de vault. **Vrai swap mainnet** sur Fluxion V3 SwapRouter (`0x5628a59dF0ECAC3f3171f877A94bEb26BA6DFAa0`) + **vrai supply** INIT Capital USDY pool (`0xf084813F1be067d980a0171F067f084f27B3F63A`) → preuve on-chain Mantlescan.

### R4 — Smart contract scope trop large
4 contrats = 4× la surface de bugs.
**Mitigation** : 2 contrats (`RWAAgent` + `RWADecisionLogger`). Policies off-chain, hash on-chain.

### R5 — Critère "Business Potential" Grand Champion ($9K)
Pas explicité dans l'analyse initiale.
**Mitigation pitch** : client = **vaults RWA institutionnels (Ondo, Backed, BlackRock BUIDL-likes), DAO treasuries holding tokenized equities, asset managers crypto-natifs**. Take rate = **bps sur AUM managé**. B2B fee, pas retail. Cette ligne dans le deck.

---

## Stratégie multi-prix (lecture du prize pool)

Le pool de $100K se décompose ainsi — **un seul projet peut empiler plusieurs prix** :

| Prix | Montant | Comment Neutrino le vise |
|---|---|---|
| Track First Prize (AI x RWA) | $8,500 | Match littéral du brief |
| Grand Champion | $9,000 | Business potential + Mantle Ecosystem Fit (mUSD, USDY, Fluxion, Bybit) |
| Community Voting (X) | $8,500 × 2 | Stratégie Twitter dédiée dès J-1 (build in public, tag Mantle / Bybit / Byreal / juges) |
| Best UI/UX | $3,000 | Dashboard institutionnel propre, lisible pour Web2 financial pro |
| Finalist Deployment | $1,000 | Deploy mainnet Mantle = automatique |

**Plafond théorique sur un projet : ~$30K.** Cible réaliste : top 5 → $10-20K capture.

---

## Ce qu'on NE build PAS

- ❌ Splitwise on-chain
- ❌ Wallet social
- ❌ Agent guard générique
- ❌ Leaderboard global d'agents
- ❌ Compliance juridique lourde
- ❌ Oracle universel
- ❌ Prédiction de prix
- ❌ Promesse de rendement
- ❌ Stock picking agressif
- ❌ Yield score généraliste
- ❌ DeFi anomaly dashboard

---

## Plan d'attaque J-1

### Vérifications critiques (2h, AVANT de coder le moteur)

- [ ] Ouvrir Fluxion mainnet → noter volume 24h sur TSLAx / SPYx / NVDAx
- [ ] Sign up Twelve Data ou Alpaca → smoke test fetch NVDA / TSLA / SPY price
- [ ] Mint ERC-8004 NFT pour l'agent sur Mantle Sepolia (exigence hackathon littérale)
- [ ] Vérifier docs Byreal Skills CLI (pour exigence hackathon AI x RWA si applicable)

### Squelette minimum J-1

**Dev 1 — Smart contracts (Foundry)**
- [ ] `RWAAgent.sol` (mint ERC-8004)
- [ ] `RWADecisionLogger.sol` (event-only)
- [ ] Deploy Mantle Sepolia
- [ ] Vérifier sur explorer

**Dev 2 — Agent service (Node + TS)**
- [ ] `fetchXStockQuote(symbol)` (via Fluxion RPC)
- [ ] `fetchReferencePrice(symbol)` (via Twelve Data / Alpaca)
- [ ] `detectMarketHours(symbol)` (NYSE/NASDAQ schedule + holidays JSON)
- [ ] `calculateRiskScore(asset)` (V1 déterministe, formule ci-dessus)
- [ ] `generateDecision(asset, profile)` → `{action, reason}`
- [ ] `logDecisionOnChain(decision)` (write au DecisionLogger)

**Dev 3 — Frontend (Next.js)**
- [ ] `/market-map`
- [ ] `/agent-decision/:asset`
- [ ] `/vault`
- [ ] `/proof`

**PM / Lead — Admin + pitch**
- [ ] Repo public init (GitHub)
- [ ] README structuré
- [ ] Page DoraHacks draft (track AI x RWA principal)
- [ ] Twitter `@NeutrinoRWA` (ou similaire), premier post build-in-public
- [ ] Pitch court (one-liner, 30s pitch, deck 5 slides ébauche)
- [ ] Document `KNOWN_LIMITATIONS.md`

---

## Kill-gates

### J+1 (24h)
Continue uniquement si :
- [ ] 1 actif xStock (ou mock honnête) affiché dans le dashboard
- [ ] 1 actif yield/stable affiché
- [ ] 1 risk score calculé end-to-end
- [ ] 1 décision `ALLOCATE` / `HOLD` / `PAUSE` générée
- [ ] 1 decision receipt loggé on-chain
- [ ] Lien explorer Mantle visible dans l'UI
- [ ] Vidéo interne 60s du flow

**Sinon : on réduit le scope, on ne change PAS d'idée.**

### J+3 (72h)
Continue uniquement si :
- [ ] 3 à 5 actifs surveillés
- [ ] 10+ décisions loggées on-chain
- [ ] 1 policy utilisateur fonctionnelle
- [ ] Allocation simulée (ou swap testnet réel via Fluxion)
- [ ] 1 action safe + 1 action bloquée/pausée démontrables
- [ ] Démo filmable
- [ ] README installable
- [ ] Architecture diagram

---

## Phase 2 plan — Execution layer (mainnet)

### Mantle mainnet contract addresses (research-validated)

**Fluxion V3** (from `Fluxion-Exchange/Fluxion-trade-skill` repo):
| Contract | Address |
|---|---|
| SwapRouter (V3) | `0x5628a59dF0ECAC3f3171f877A94bEb26BA6DFAa0` |
| Factory | `0xF883162Ed9c7E8EF604214c964c678E40c9B737C` |
| QuoterV2 | `0x3E4eE18Ac7280813236a1EB850679Da5322E14CE` |
| Quote API | `https://skillapi.fluxion.network/quote/exact-in` |

**INIT Capital** (from `dev.init.capital/contract-addresses/mantle`):
| Contract | Address |
|---|---|
| InitCore | `0x972BcB0284cca0152527c4f70f8F689852bCAFc5` |
| PosManager | `0x0e7401707CD08c03CDb53DAEF3295DDFb68BBa92` |
| Pool USDY (RWA) | `0xf084813F1be067d980a0171F067f084f27B3F63A` |
| Pool USDC | `0x00A55649E597d463fD212fBE48a3B40f0E227d06` |
| Pool USDe | `0x3282437C436eE6AA9861a6A46ab0822d82581b1c` |
| Pool METH | `0x5071c003bB45e49110a905c1915EbdD2383A89dF` |

**Mantle mainnet tokens**:
| Symbol | Address |
|---|---|
| WMNT | `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` |
| USDC | `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` |
| USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` |
| USDY (Ondo) | `0x5bE26527e817998A7206475496fDE1E68957c5A6` |
| mUSD (Mantle native, rebasing) | `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3` |

### Decision → execution mapping

| Agent action | On-chain execution |
|---|---|
| `ALLOCATE` | Fluxion `exactInputSingle(USDC, mETH, fee, ...)` (or USDC ↔ WMNT) |
| `HOLD` | No-op. Log only. |
| `REDUCE` | Fluxion swap inverse (partial unwind of the active position) |
| `PAUSE` | No-op. Log + flag agent state. |
| `MOVE_TO_STABLE_YIELD` | Swap to USDC if needed, then `InitCore.mintTo(USDY pool, recipient)` → real Ondo T-bill yield exposure |
| `REQUIRE_HUMAN_CONFIRMATION` | Emit on-chain event, halt auto-execution |

### Network choice

**Full mainnet pivot.** Sepolia counterparts for Fluxion / INIT / Ondo USDY are not documented. Mainnet runs cost ~$0.60 in gas total + ~$2-3 USDC for demo swap amounts. Total demo budget: **~$3-5**, fits a $10 starter wallet.

The user funds the existing burner address `0xdE7140BF0803257C493f26B588Dd68460f654860` on Mantle mainnet (~0.5 MNT + ~$3 USDC). Sepolia decisions become legacy/historical.

### Phase 2 dev steps (~7h, 1 dev senior)

1. Add Mantle mainnet RPC + chain config (`foundry.toml`, web env, agent env). — 30 min
2. Redeploy `RWAAgent` + `RWADecisionLogger` to Mantle mainnet. — 5 min once funded
3. Wire Fluxion V3 SwapRouter wrapper (Uniswap V3 ABI + QuoterV2 quote). — 1.5h
4. Wire INIT Capital supplier (USDC pool / USDY pool). — 1.5h
5. Extend `runAgentOnce` with optional execution layer (gated by `EXECUTE_ON_CHAIN=true`). — 1h
6. UI: live "actions" panel with last 3 on-chain executions + Mantlescan links. — 1h
7. Smoke test E2E with $1 USDC swap. — 30 min
8. Polish + redeploy Vercel with mainnet env vars. — 30 min

### Optional 30-min adds (post Phase 2)

- Publish `agent-card.json` at `https://neutrino-fawn.vercel.app/agent-card.json` per ERC-8004 v1 schema (`name=Neutrino`, `services=[{type:"web", url}]`, `supportedTrust=["reputation"]`).
- IPFS pin the off-chain reasonHash payloads (full breakdown + LLM prose) → `/agent-decision/[asset]` resolves the hash to the real explanation.

---

## Sources

- [Mantle Turing Test 2026 — DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)
- [ERC-8004 Developer's Guide — QuickNode](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [Mantle xStocks launch (April 2026) — BanklessTimes](https://www.banklesstimes.com/articles/2026/04/10/mantle-launches-xstocks-bringing-tokenized-equities-to-l2/)
- [Mantle xStocks press release — Bybit / BackedFi / Flowdesk / Fluxion](https://www.prnewswire.com/news-releases/mantle-becomes-one-of-the-first-ethereum-l2s-to-bring-tokenized-equities-to-on-chain-liquidity-with-xstocks-and-bybit-302739354.html)
- [CV VC: AI Agents as Catalyst for Onchain Finance](https://www.cvvc.com/blogs/cv-vc-insights-ai-agents-as-the-catalyst-for-onchain-finance)
- [Mantle Global Hackathon 2025 categories](https://chainwire.org/2026/02/02/mantle-global-hackathon-2025-over-2000-web3-builders-worldwide-innovate-in-the-next-wave-of-rwa-and-ai/)
- [Fluxion-Exchange/Fluxion-trade-skill GitHub (router/factory/quoter addresses)](https://github.com/Fluxion-Exchange/Fluxion-trade-skill)
- [Fluxion gitbook — V3 SwapRouter](https://fluxion-network.gitbook.io/fluxion-network/developer-resources/technical-overview-and-api/amm-v3-swaprouter.md)
- [INIT Capital Mantle dev docs](https://dev.init.capital/contract-addresses/mantle)
- [Ondo USDY addresses](https://docs.ondo.finance/addresses)
- [Ondo USDY Mantle integration guide](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines)
- [ERC-8004 EIP](https://eips.ethereum.org/EIPS/eip-8004)
- [Aave V3 on Mantle ARFC governance (still in proposal)](https://governance.aave.com/t/arfc-deploy-aave-v3-on-mantle/20542)
