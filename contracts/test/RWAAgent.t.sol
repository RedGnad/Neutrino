// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {RWAAgent} from "../src/RWAAgent.sol";

contract RWAAgentTest is Test {
    RWAAgent agent;
    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    address stranger = address(0xC0DE);

    function setUp() public {
        agent = new RWAAgent(owner);
    }

    function test_MintAgent_AssignsIdAndCard() public {
        vm.prank(owner);
        uint256 id = agent.mintAgent(owner, operator, "ipfs://card1");

        assertEq(id, 1);
        assertEq(agent.ownerOf(id), owner);
        assertEq(agent.operatorOf(id), operator);
        assertEq(agent.tokenURI(id), "ipfs://card1");
    }

    function test_IsAuthorized_OwnerAndOperator() public {
        vm.prank(owner);
        uint256 id = agent.mintAgent(owner, operator, "ipfs://x");

        assertTrue(agent.isAuthorized(id, owner));
        assertTrue(agent.isAuthorized(id, operator));
        assertFalse(agent.isAuthorized(id, stranger));
    }

    function test_SetCardURI_OnlyOwner() public {
        vm.prank(owner);
        uint256 id = agent.mintAgent(owner, operator, "ipfs://old");

        vm.prank(operator);
        vm.expectRevert(RWAAgent.NotOwnerOrOperator.selector);
        agent.setCardURI(id, "ipfs://new");

        vm.prank(owner);
        agent.setCardURI(id, "ipfs://new");
        assertEq(agent.tokenURI(id), "ipfs://new");
    }

    function test_SubmitFeedback_EmitsEvent() public {
        vm.prank(owner);
        uint256 id = agent.mintAgent(owner, operator, "ipfs://card");

        vm.expectEmit(true, true, false, true);
        emit RWAAgent.Feedback(id, stranger, 1, bytes32(uint256(0xdeadbeef)));

        vm.prank(stranger);
        agent.submitFeedback(id, 1, bytes32(uint256(0xdeadbeef)));
    }

    function test_SubmitFeedback_RevertsOnInvalidScore() public {
        vm.prank(owner);
        uint256 id = agent.mintAgent(owner, operator, "ipfs://card");

        vm.prank(stranger);
        vm.expectRevert(RWAAgent.InvalidScore.selector);
        agent.submitFeedback(id, 101, bytes32(0));
    }
}
