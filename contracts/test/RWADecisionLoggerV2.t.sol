// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {RWADecisionLoggerV2, IERC8004IdentityRegistry} from "../src/RWADecisionLoggerV2.sol";

/// @dev Stand-in for the canonical ERC-8004 IdentityRegistry. Real registry is
///      ERC721URIStorageUpgradeable; for auth we only need ERC-721 ownership +
///      approval semantics, which OpenZeppelin's ERC721 provides verbatim.
contract MockIdentityRegistry is ERC721 {
    uint256 private _lastId;

    constructor() ERC721("AgentIdentity", "AGENT") {}

    function register() external returns (uint256 agentId) {
        agentId = _lastId++;
        _safeMint(msg.sender, agentId);
    }
}

contract RWADecisionLoggerV2Test is Test {
    MockIdentityRegistry registry;
    RWADecisionLoggerV2 logger;

    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    address stranger = address(0xC0DE);
    address constant NVDAX = address(0x1111);

    uint256 agentId;

    function setUp() public {
        registry = new MockIdentityRegistry();
        logger = new RWADecisionLoggerV2(IERC8004IdentityRegistry(address(registry)));
        vm.prank(owner);
        agentId = registry.register();
    }

    function test_LogDecision_FromOwner() public {
        vm.expectEmit(true, true, false, true);
        emit RWADecisionLoggerV2.DecisionLogged(
            agentId,
            NVDAX,
            RWADecisionLoggerV2.Action.PAUSE,
            820,
            keccak256("reason:market_closed"),
            keccak256("policy:no_after_hours"),
            uint64(block.timestamp),
            owner
        );

        vm.prank(owner);
        logger.logDecision(
            agentId,
            NVDAX,
            RWADecisionLoggerV2.Action.PAUSE,
            820,
            keccak256("reason:market_closed"),
            keccak256("policy:no_after_hours")
        );
    }

    function test_LogDecision_FromApprovedOperator() public {
        vm.prank(owner);
        registry.setApprovalForAll(operator, true);

        vm.prank(operator);
        logger.logDecision(agentId, NVDAX, RWADecisionLoggerV2.Action.HOLD, 100, bytes32(0), bytes32(0));
    }

    function test_LogDecision_RevertsForUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(RWADecisionLoggerV2.Unauthorized.selector);
        logger.logDecision(agentId, NVDAX, RWADecisionLoggerV2.Action.HOLD, 100, bytes32(0), bytes32(0));
    }

    function test_LogDecision_RevertsOnRiskScoreOutOfRange() public {
        vm.prank(owner);
        vm.expectRevert(RWADecisionLoggerV2.RiskScoreOutOfRange.selector);
        logger.logDecision(agentId, NVDAX, RWADecisionLoggerV2.Action.HOLD, 1001, bytes32(0), bytes32(0));
    }
}
