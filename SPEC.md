# Neutrino

> Market-aware AI risk-allocation agent for Mantle tokenized RWAs.

**Pitch (one-liner):** Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.

**Long pitch:** Neutrino is an AI risk-allocation agent for Mantle RWAs. It monitors tokenized equities (xStocks) and yield-bearing assets, detects liquidity, basis and market-hours risk, then reallocates or pauses exposure with every decision recorded on-chain via ERC-8004 agent identity.

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
2. **Mantle pousse fort RWA / institutional liquidity** : Nansen positionne Mantle comme distribution layer pour TradFi/RWA ; intégration Aave a fait $1B en 19 jours.
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

**3. Mantle DeFi venues** — Fluxion (xStocks), Aave Mantle (si accessible), Agni / Merchant Moe, Byreal / RealClaw / Skills (selon exigences hackathon).

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
| Frontend | Next.js + shadcn/ui + Tailwind. Design **institutionnel**, pas cyberpunk. |
| Smart contracts | Solidity, Foundry. Mantle Sepolia → Mantle mainnet. |
| Agent | Node.js (TypeScript) — fetch loop + risk engine + decision writer |
| LLM | AI SDK via Vercel AI Gateway (provider-agnostic) — pour les explanations only |
| Reference price feed | **Twelve Data** ou **Alpaca** (free tier, sign up J-1) |
| xStocks data | Fluxion DEX (on-chain) + Mantle RPC |
| Market hours | Static schedule + JSONfile (NYSE / NASDAQ holidays) |

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
**Mitigation** : pas de vault. Swap réel sur **Fluxion Mantle Sepolia** : agent dit PAUSE → exit position → reçoit USDY → preuve on-chain.

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

## Sources

- [Mantle Turing Test 2026 — DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026)
- [ERC-8004 Developer's Guide — QuickNode](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [Mantle xStocks launch (April 2026) — BanklessTimes](https://www.banklesstimes.com/articles/2026/04/10/mantle-launches-xstocks-bringing-tokenized-equities-to-l2/)
- [Mantle xStocks press release — Bybit / BackedFi / Flowdesk / Fluxion](https://www.prnewswire.com/news-releases/mantle-becomes-one-of-the-first-ethereum-l2s-to-bring-tokenized-equities-to-on-chain-liquidity-with-xstocks-and-bybit-302739354.html)
- [CV VC: AI Agents as Catalyst for Onchain Finance](https://www.cvvc.com/blogs/cv-vc-insights-ai-agents-as-the-catalyst-for-onchain-finance)
- [Mantle Global Hackathon 2025 categories](https://chainwire.org/2026/02/02/mantle-global-hackathon-2025-over-2000-web3-builders-worldwide-innovate-in-the-next-wave-of-rwa-and-ai/)
