// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @dev Minimal slice of the canonical ERC-8004 Identity Registry (ERC-721 +
///      URIStorage) that we need to authorize decision logging. The canonical
///      registry uses exactly this owner/approval check internally
///      (see IdentityRegistryUpgradeable.setAgentURI / setMetadata).
interface IERC8004IdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
    function getApproved(uint256 agentId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/// @title RWADecisionLoggerV2 — decision trail bound to the canonical ERC-8004 identity.
/// @notice Event-only, same shape as V1 (stores nothing), but authorization is
///         delegated to the canonical ERC-8004 Identity Registry on Mantle
///         (per-chain singleton, ERC-721). The logged `agentId` is the agent's
///         REAL ERC-8004 identity, so any judge can filter DecisionLogged by
///         the same agentId that resolves to the on-chain registration file.
/// @dev V1 (RWADecisionLogger) authorized against a bespoke RWAAgent NFT. V2
///      drops that contract and uses the standard registry every Turing Test
///      Hackathon agent shares. V1's historical events stay valid on its own
///      address; new decisions are logged here.
contract RWADecisionLoggerV2 {
    enum Action {
        ALLOCATE,
        HOLD,
        REDUCE,
        PAUSE,
        MOVE_TO_STABLE_YIELD,
        REQUIRE_HUMAN_CONFIRMATION
    }

    /// @notice Canonical ERC-8004 IdentityRegistry this logger authorizes against.
    IERC8004IdentityRegistry public immutable identityRegistry;

    /// @param agentId      ERC-8004 token id of the agent (canonical registry).
    /// @param asset        Token address (xStock, USDY, mETH, etc.) the decision applies to.
    /// @param action       What the agent decided to do.
    /// @param riskScore    0..1000 — higher means riskier.
    /// @param reasonHash   keccak256 of the off-chain canonical decision JSON.
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

    constructor(IERC8004IdentityRegistry _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    /// @notice Can `caller` act for `agentId`? Owner, single-token approvee, or operator.
    /// @dev Mirrors the canonical registry's own authorization predicate.
    ///      Reverts via ownerOf() if the agentId was never registered.
    function isAuthorized(uint256 agentId, address caller) public view returns (bool) {
        address owner = identityRegistry.ownerOf(agentId);
        return caller == owner
            || identityRegistry.getApproved(agentId) == caller
            || identityRegistry.isApprovedForAll(owner, caller);
    }

    function logDecision(
        uint256 agentId,
        address asset,
        Action action,
        uint16 riskScore,
        bytes32 reasonHash,
        bytes32 policyHash
    ) external {
        if (!isAuthorized(agentId, msg.sender)) revert Unauthorized();
        if (riskScore > 1000) revert RiskScoreOutOfRange();

        emit DecisionLogged(
            agentId, asset, action, riskScore, reasonHash, policyHash, uint64(block.timestamp), msg.sender
        );
    }
}
