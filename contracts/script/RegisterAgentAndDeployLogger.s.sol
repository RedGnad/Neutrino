// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {RWADecisionLoggerV2, IERC8004IdentityRegistry} from "../src/RWADecisionLoggerV2.sol";

/// @dev The two calls we make on the canonical ERC-8004 IdentityRegistry.
///      Signatures verified against
///      erc-8004/erc-8004-contracts/contracts/IdentityRegistryUpgradeable.sol.
interface IIdentityRegistry {
    function register(string memory agentURI) external returns (uint256 agentId);
    function setApprovalForAll(address operator, bool approved) external;
}

/// @notice Registers Neutrino's agent on the CANONICAL ERC-8004 IdentityRegistry
///         (per-chain singleton, verifiable on Mantlescan), then deploys
///         RWADecisionLoggerV2 bound to that registry.
///
/// Canonical addresses (https://github.com/erc-8004/erc-8004-contracts):
///   Mantle Mainnet (5000): 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
///   Mantle Testnet:        0x8004A818BFB912233c491871b3d84c89A494BD9e
///
/// Env:
///   DEPLOYER_PRIVATE_KEY   broadcasts; becomes the agent OWNER.
///   AGENT_CARD_URI         agentURI -> registration file (e.g.
///                          https://neutrino-fawn.vercel.app/agent-card.json).
///   AGENT_OPERATOR_ADDRESS optional: the wallet that signs decision logs in
///                          /api/run-agent. If different from the deployer, it
///                          is approved as an operator so it can log decisions.
///
/// Usage (mainnet):
///   set -a && source ../.env && set +a && \
///   forge script script/RegisterAgentAndDeployLogger.s.sol --rpc-url mantle --broadcast
///
/// After broadcast, set in web/.env.local (and Vercel):
///   NEXT_PUBLIC_DEFAULT_AGENT_ID            = <printed agentId>
///   NEXT_PUBLIC_RWA_DECISION_LOGGER_ADDRESS = <printed RWADecisionLoggerV2>
///   NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY   = <printed IdentityRegistry>
contract RegisterAgentAndDeployLogger is Script {
    address constant IDENTITY_MAINNET = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address constant IDENTITY_TESTNET = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        string memory agentURI = vm.envString("AGENT_CARD_URI");
        address operator = vm.envOr("AGENT_OPERATOR_ADDRESS", address(0));

        address identity = block.chainid == 5000 ? IDENTITY_MAINNET : IDENTITY_TESTNET;

        vm.startBroadcast(deployerKey);

        uint256 agentId = IIdentityRegistry(identity).register(agentURI);

        // Let the runner wallet log decisions for this agent if it differs from
        // the owner. Owner can always log; an approved operator can too.
        if (operator != address(0) && operator != deployer) {
            IIdentityRegistry(identity).setApprovalForAll(operator, true);
        }

        RWADecisionLoggerV2 logger = new RWADecisionLoggerV2(IERC8004IdentityRegistry(identity));

        vm.stopBroadcast();

        console.log("ERC-8004 IdentityRegistry:", identity);
        console.log("Neutrino agentId:         ", agentId);
        console.log("RWADecisionLoggerV2:      ", address(logger));
        console.log("Agent owner (deployer):   ", deployer);
        console.log("Approved operator:        ", operator);
    }
}
