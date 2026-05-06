// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {RWAAgent} from "../src/RWAAgent.sol";
import {RWADecisionLogger} from "../src/RWADecisionLogger.sol";

/// @notice Deploys RWAAgent + RWADecisionLogger and mints a genesis agent NFT.
///
/// Usage (Sepolia):
///     set -a && source ../.env && set +a && \
///     forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast
///
/// Usage (mainnet — Phase 2):
///     set -a && source ../.env && set +a && \
///     forge script script/Deploy.s.sol --rpc-url mantle --broadcast
///
/// After broadcast, copy the printed RWAAgent / RWADecisionLogger addresses
/// into web/.env.local and the corresponding Vercel env vars, then redeploy.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        string memory cardURI = vm.envOr("AGENT_CARD_URI", string("ipfs://placeholder-neutrino-card"));

        vm.startBroadcast(deployerKey);

        RWAAgent agent = new RWAAgent(deployer);
        RWADecisionLogger logger = new RWADecisionLogger(agent);

        // Mint genesis agent (id = 1) owned & operated by deployer.
        uint256 agentId = agent.mintAgent(deployer, deployer, cardURI);

        vm.stopBroadcast();

        console.log("RWAAgent:           ", address(agent));
        console.log("RWADecisionLogger:  ", address(logger));
        console.log("Genesis agent id:   ", agentId);
        console.log("Deployer / operator:", deployer);
    }
}
