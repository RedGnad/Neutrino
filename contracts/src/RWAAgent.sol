// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RWAAgent — ERC-8004 agent identity NFT for Neutrino.
/// @notice Each agent is represented by an ERC-721 NFT pointing to an off-chain agent card
///         (JSON with name, capabilities, endpoints, payment address). A lightweight
///         feedback layer records reputation against the agent identity.
/// @dev Draft ERC-8004 has no canonical implementation. This is a minimal-but-honest
///      shape: ERC-721 + per-token card URI + on-chain feedback events.
contract RWAAgent is ERC721, Ownable {
    uint256 private _nextId = 1;

    /// @dev tokenId => off-chain agent card URI (https / ipfs).
    mapping(uint256 => string) private _cardURI;

    /// @dev tokenId => agent operator (entity that controls execution).
    mapping(uint256 => address) public operatorOf;

    event AgentRegistered(uint256 indexed tokenId, address indexed owner, address operator, string cardURI);
    event AgentCardUpdated(uint256 indexed tokenId, string newCardURI);
    event AgentOperatorUpdated(uint256 indexed tokenId, address newOperator);
    event Feedback(uint256 indexed tokenId, address indexed from, int8 score, bytes32 contextHash);

    error NotOwnerOrOperator();
    error InvalidScore();

    constructor(address initialOwner) ERC721("Neutrino Agent", "nAGENT") Ownable(initialOwner) {}

    /// @notice Mint an agent identity NFT.
    /// @param to        Owner of the identity.
    /// @param operator  Address allowed to execute on behalf of this agent.
    /// @param cardURI   Off-chain agent card URI.
    function mintAgent(address to, address operator, string calldata cardURI) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        _cardURI[tokenId] = cardURI;
        operatorOf[tokenId] = operator;
        emit AgentRegistered(tokenId, to, operator, cardURI);
    }

    /// @notice Update the agent card URI. Only the token owner.
    function setCardURI(uint256 tokenId, string calldata newCardURI) external {
        if (ownerOf(tokenId) != msg.sender) revert NotOwnerOrOperator();
        _cardURI[tokenId] = newCardURI;
        emit AgentCardUpdated(tokenId, newCardURI);
    }

    /// @notice Update the operator. Only the token owner.
    function setOperator(uint256 tokenId, address newOperator) external {
        if (ownerOf(tokenId) != msg.sender) revert NotOwnerOrOperator();
        operatorOf[tokenId] = newOperator;
        emit AgentOperatorUpdated(tokenId, newOperator);
    }

    /// @notice Record reputation feedback for an agent.
    /// @dev Anyone can submit; reputation aggregation happens off-chain from events.
    /// @param score        -1 (negative), 0 (neutral), +1 (positive). Bigger range allowed up to int8.
    /// @param contextHash  keccak256 of the off-chain context (e.g. decision id, interaction).
    function submitFeedback(uint256 tokenId, int8 score, bytes32 contextHash) external {
        if (score < -100 || score > 100) revert InvalidScore();
        // Reverts if token doesn't exist:
        ownerOf(tokenId);
        emit Feedback(tokenId, msg.sender, score, contextHash);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // reverts if not minted
        return _cardURI[tokenId];
    }

    /// @notice Authorization helper: can `caller` act for `tokenId`?
    function isAuthorized(uint256 tokenId, address caller) external view returns (bool) {
        return ownerOf(tokenId) == caller || operatorOf[tokenId] == caller;
    }
}
