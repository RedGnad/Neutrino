// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {RWAAgent} from "./RWAAgent.sol";

/// @title RWADecisionLogger — event-only on-chain decision trail for Neutrino agents.
/// @notice Stores nothing. Emits one event per decision so an off-chain indexer can build
///         the full audit log. Cheap to call on Mantle (low gas L2).
/// @dev Authorization is gated by RWAAgent.isAuthorized() to ensure only the agent
///      owner or designated operator can log decisions for a given agentId.
contract RWADecisionLogger {
    enum Action {
        ALLOCATE,
        HOLD,
        REDUCE,
        PAUSE,
        MOVE_TO_STABLE_YIELD,
        REQUIRE_HUMAN_CONFIRMATION
    }

    RWAAgent public immutable agentRegistry;

    /// @notice Decision recorded by an agent for a given asset at a point in time.
    /// @param agentId      ERC-8004 token id of the agent.
    /// @param asset        Token address (xStock, USDY, mETH, etc.) the decision applies to.
    /// @param action       What the agent decided to do.
    /// @param riskScore    0..1000 (basis-points-ish) — higher means riskier.
    /// @param reasonHash   keccak256 of the off-chain JSON explanation.
    /// @param policyHash   keccak256 of the user policy / profile JSON in effect.
    event DecisionLogged(
        uint256 indexed agentId,
        address indexed asset,
        Action action,
        uint16 riskScore,
        bytes32 reasonHash,
        bytes32 policyHash,
        uint64 timestamp,
        address indexed caller
    );

    error Unauthorized();
    error RiskScoreOutOfRange();

    constructor(RWAAgent _agentRegistry) {
        agentRegistry = _agentRegistry;
    }

    function logDecision(
        uint256 agentId,
        address asset,
        Action action,
        uint16 riskScore,
        bytes32 reasonHash,
        bytes32 policyHash
    ) external {
        if (!agentRegistry.isAuthorized(agentId, msg.sender)) revert Unauthorized();
        if (riskScore > 1000) revert RiskScoreOutOfRange();

        emit DecisionLogged(
            agentId, asset, action, riskScore, reasonHash, policyHash, uint64(block.timestamp), msg.sender
        );
    }
}
