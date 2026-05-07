# Neutrino contracts

Two minimal contracts on Mantle. Both are deterministic, event-only, and gated
by ERC-8004 identity ownership.

## Deployments

| Contract | Mantle mainnet | Mantle Sepolia |
|---|---|---|
| `RWAAgent` (ERC-8004 identity NFT) | [`0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96`](https://mantlescan.xyz/address/0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96) | [`0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96`](https://sepolia.mantlescan.xyz/address/0x6eF0D0b946187B066DC7D670603FDE9928Ad4C96) |
| `RWADecisionLogger` | [`0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2`](https://mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2) | [`0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2`](https://sepolia.mantlescan.xyz/address/0xeA72FEdBfe91C03664B15cb1d735A7fceaa68Ef2) |
| Genesis agent (tokenId 1) | minted to deployer | minted to deployer |

Same addresses on both networks thanks to CREATE determinism (same deployer +
same nonce → same contract address).

## Build & test

```bash
forge build           # 0 errors on Solidity 0.8.27, EVM cancun
forge test --summary  # 8 tests, all pass (5 RWAAgent, 3 RWADecisionLogger)
```

## Deploy

Set `DEPLOYER_PRIVATE_KEY`, `MANTLE_MAINNET_RPC` (or `MANTLE_SEPOLIA_RPC`),
`MANTLESCAN_API_KEY`, optionally `AGENT_CARD_URI` in the project root `.env`,
then:

```bash
set -a && source ../.env && set +a
forge script script/Deploy.s.sol --rpc-url mantle --broadcast        # ~0.20 MNT
# or
forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast
```

The script prints `RWAAgent`, `RWADecisionLogger`, the genesis agent id, and
the deployer address. Copy them into `web/.env.local`.

## RWAAgent.sol — minimal ERC-8004 identity NFT

ERC-8004 (Trustless Agents) is still a draft EIP. There is no canonical
implementation. We ship a minimal-but-honest shape:

- **ERC-721** identity per agent (`mintAgent(owner, operator, cardURI)`).
- **Per-token agent card URI** that points to an off-chain JSON describing the
  agent (name, capabilities, endpoints, payment address).
- **Operator distinct from owner** so the runner key (server) can act for the
  agent without holding ownership of the NFT.
- **`isAuthorized(tokenId, caller)`** is the gate used by `RWADecisionLogger`
  to ensure only owner or operator can log decisions.
- **Lightweight feedback events** (`Feedback(tokenId, from, score, contextHash)`)
  for downstream reputation aggregation. Anyone can submit; aggregation is off-chain.

## RWADecisionLogger.sol — event-only audit trail

No storage. Every `logDecision` call emits a single event:

```solidity
event DecisionLogged(
  uint256 indexed agentId,
  address indexed asset,
  Action action,             // 0..5: ALLOCATE / HOLD / REDUCE / PAUSE / MOVE_TO_STABLE_YIELD / REQUIRE_HUMAN_CONFIRMATION
  uint16 riskScore,          // 0..1000
  bytes32 reasonHash,        // keccak256 of the canonical audit JSON (see web/src/lib/agent/decision/canonical.ts)
  bytes32 policyHash,        // keccak256 of the policy JSON
  uint64 timestamp,
  address indexed caller
);
```

Authorization is gated by `RWAAgent.isAuthorized(agentId, msg.sender)`.
`riskScore` is bounded server-side and re-bounded by the contract.

The `reasonHash` is the load-bearing field. It binds the on-chain decision to
a specific off-chain audit payload (asset metadata, market snapshot, source
flags, breakdown, policy, action, narration). A judge can re-hash the cached
JSON and confirm the contract emitted the same bytes32. See the verifier
component in `web/src/components/DecisionVerifier.tsx`.

## Why event-only

Mantle is a low-gas L2 — emitting events with bounded data is cheap and the
canonical truth lives off-chain (recoverable by `reasonHash`). Storing full
decision data on-chain would be expensive and would couple the schema to the
contract; events keep the schema upgradable without redeploying.

## Tests

```
contracts/test/
├── RWAAgent.t.sol            # mint, operator, feedback, authorization
└── RWADecisionLogger.t.sol   # log from operator, revert unauthorized, revert risk OOR
```
