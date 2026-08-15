// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AdhikaarRegistry} from "../src/AdhikaarRegistry.sol";

contract DeployAdhikaarRegistry is Script {
    function run() external returns (AdhikaarRegistry registry) {
        // Defaults are public addresses for Anvil's first three unlocked accounts.
        // Production deployments must override them with independent consortium addresses.
        address first = vm.envOr("VALIDATOR_ONE_ADDRESS", address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));
        address second = vm.envOr("VALIDATOR_TWO_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));
        address third = vm.envOr("VALIDATOR_THREE_ADDRESS", address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC));
        address[3] memory validators = [first, second, third];
        vm.startBroadcast();
        registry = new AdhikaarRegistry(validators);
        vm.stopBroadcast();
    }
}
