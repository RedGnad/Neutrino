# Demo video recording checklist (2:00–2:30)

Screen-record in one take. No edits needed if you follow this order.

**[0:00–0:20] Open — the problem**
- Open https://neutrino-fawn.vercel.app
- Say: *"Tokenized stocks like NVDAx and TSLAx now trade 24/7 on Mantle. Their underlying markets don't. Between 4 PM and 9:30 AM there is no price discovery, no liquidity — but the tokens keep trading. Autonomous agents need to know when not to act."*
- Point to the hero headline.

**[0:20–0:50] Run risky xStocks scenario**
- Click **Run risky scenario** (Scenario 01 — NVDAx / TSLAx / SPYx).
- Wait for the 3 on-chain receipts in the live hero column.
- Say: *"The deterministic engine reads live xStocks signals and scores risk. The LLM only narrates — it never controls the decision."*
- Point to the PAUSE badges.

**[0:50–1:10] Show the proof**
- Click **On-chain proofs** → `/proof`.
- Say: *"Every decision is written on Mantle through `RWADecisionLogger.logDecision()`. These are the tx hashes."*
- Click one tx hash → Mantlescan opens, shows `DecisionLogged` event with `reasonHash`, `riskScore`, `action`.

**[1:10–1:30] Verify the receipt**
- Click **Receipt →** for NVDAx → `/agent-decision/NVDAx`.
- Click **Verify hash**.
- Show the green `✓ VERIFIED MATCH` banner.
- Say: *"The `reasonHash` on Mantlescan equals `keccak256` of the full canonical audit JSON generated off-chain. The receipt is binding."*

**[1:30–1:45] Safe yield scenario**
- Navigate back → Run **safe yield** (Scenario 02 — USDY / mETH).
- Show ALLOCATE decisions at riskScore 0/1000.
- Say: *"USDY and mETH carry no market-hours risk. The agent allocates."*

**[1:45–2:00] Contract on Mantlescan**
- Open https://mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2#code
- Show the "Source Code Verified — Exact Match" badge and the Solidity source.
- Say: *"Both contracts are deployed and verified on Mantle Mainnet, chain ID 5000."*

**[2:00–2:20] Close**
- Return to homepage.
- Say: *"Neutrino is the safety layer that tells autonomous RWA agents when capital should not move. Deterministic rules, verifiable receipts, honest about every data source. Built for Mantle."*
