// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {RWAAgent} from "../src/RWAAgent.sol";
import {RWADecisionLogger} from "../src/RWADecisionLogger.sol";

contract RWADecisionLoggerTest is Test {
    RWAAgent agent;
    RWADecisionLogger logger;

    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    address stranger = address(0xC0DE);
    address constant NVDAX = address(0x1111);

    uint256 agentId;

    function setUp() public {
        agent = new RWAAgent(owner);
        logger = new RWADecisionLogger(agent);
        vm.prank(owner);
        agentId = agent.mintAgent(owner, operator, "ipfs://card");
    }

    function test_LogDecision_FromOperator() public {
        vm.expectEmit(true, true, false, true);
        emit RWADecisionLogger.DecisionLogged(
            agentId,
            NVDAX,
            RWADecisionLogger.Action.PAUSE,
            820,
            keccak256("reason:market_closed"),
            keccak256("policy:growth_xstocks"),
            uint64(block.timestamp),
            operator
        );

        vm.prank(operator);
        logger.logDecision(
            agentId,
            NVDAX,
            RWADecisionLogger.Action.PAUSE,
            820,
            keccak256("reason:market_closed"),
            keccak256("policy:growth_xstocks")
        );
    }

    function test_LogDecision_RevertsForUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(RWADecisionLogger.Unauthorized.selector);
        logger.logDecision(agentId, NVDAX, RWADecisionLogger.Action.HOLD, 100, bytes32(0), bytes32(0));
    }

    function test_LogDecision_RevertsOnRiskScoreOutOfRange() public {
        vm.prank(operator);
        vm.expectRevert(RWADecisionLogger.RiskScoreOutOfRange.selector);
        logger.logDecision(agentId, NVDAX, RWADecisionLogger.Action.HOLD, 1001, bytes32(0), bytes32(0));
    }
}
