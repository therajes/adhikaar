// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {AdhikaarRegistry} from "../src/AdhikaarRegistry.sol";

contract AdhikaarRegistryTest is Test {
    AdhikaarRegistry registry;
    address validatorOne = address(0x101);
    address validatorTwo = address(0x202);
    address validatorThree = address(0x303);
    address outsider = address(0xBAD);
    bytes32 institutionId = keccak256("bharat-trust-bank-demo");
    bytes32 keyHash = keccak256("demo-public-key");
    bytes32 metadataHash = keccak256("fictional-metadata");

    function setUp() public {
        address[3] memory validators = [validatorOne, validatorTwo, validatorThree];
        registry = new AdhikaarRegistry(validators);
    }

    function proposeAndApprove(AdhikaarRegistry.ProposalType proposalType, bytes32 value, bytes32 auxiliary)
        internal
        returns (bytes32 id)
    {
        vm.prank(validatorOne);
        id = registry.propose(proposalType, institutionId, value, auxiliary);
        vm.prank(validatorOne);
        registry.approve(id);
        vm.prank(validatorTwo);
        registry.approve(id);
    }

    function registerInstitution() internal {
        proposeAndApprove(AdhikaarRegistry.ProposalType.Register, keyHash, metadataHash);
    }

    function testNonValidatorCannotPropose() public {
        vm.prank(outsider);
        vm.expectRevert(AdhikaarRegistry.NotValidator.selector);
        registry.propose(AdhikaarRegistry.ProposalType.Register, institutionId, keyHash, metadataHash);
    }

    function testNonValidatorCannotApprove() public {
        vm.prank(validatorOne);
        bytes32 id = registry.propose(AdhikaarRegistry.ProposalType.Register, institutionId, keyHash, metadataHash);
        vm.prank(outsider);
        vm.expectRevert(AdhikaarRegistry.NotValidator.selector);
        registry.approve(id);
    }

    function testDuplicateApprovalRejected() public {
        vm.prank(validatorOne);
        bytes32 id = registry.propose(AdhikaarRegistry.ProposalType.Register, institutionId, keyHash, metadataHash);
        vm.prank(validatorOne);
        registry.approve(id);
        vm.prank(validatorOne);
        vm.expectRevert(AdhikaarRegistry.DuplicateApproval.selector);
        registry.approve(id);
    }

    function testOneApprovalIsInsufficient() public {
        vm.prank(validatorOne);
        bytes32 id = registry.propose(AdhikaarRegistry.ProposalType.Register, institutionId, keyHash, metadataHash);
        vm.prank(validatorOne);
        registry.approve(id);
        assertFalse(registry.getInstitution(institutionId).active);
    }

    function testTwoApprovalsActivateInstitution() public {
        registerInstitution();
        AdhikaarRegistry.Institution memory institution = registry.getInstitution(institutionId);
        assertTrue(institution.active);
        assertEq(institution.publicKeyHash, keyHash);
        assertEq(institution.metadataHash, metadataHash);
    }

    function testKeyRotationRequiresThreshold() public {
        registerInstitution();
        bytes32 rotated = keccak256("rotated-key");
        vm.prank(validatorOne);
        bytes32 id = registry.propose(AdhikaarRegistry.ProposalType.RotateKey, institutionId, rotated, bytes32(0));
        vm.prank(validatorOne);
        registry.approve(id);
        assertEq(registry.getInstitution(institutionId).publicKeyHash, keyHash);
        vm.prank(validatorThree);
        registry.approve(id);
        assertEq(registry.getInstitution(institutionId).publicKeyHash, rotated);
    }

    function testPolicyRootPublication() public {
        registerInstitution();
        bytes32 root = keccak256("policy-root");
        proposeAndApprove(AdhikaarRegistry.ProposalType.PublishPolicyRoot, root, bytes32(0));
        assertEq(registry.getInstitution(institutionId).currentPolicyRoot, root);
    }

    function testRevocationRootPublication() public {
        registerInstitution();
        bytes32 root = keccak256("revocation-root");
        proposeAndApprove(AdhikaarRegistry.ProposalType.PublishRevocationRoot, root, bytes32(0));
        assertEq(registry.getInstitution(institutionId).currentRevocationRoot, root);
    }

    function testSnapshotPublication() public {
        registerInstitution();
        bytes32 root = keccak256("snapshot-root");
        proposeAndApprove(AdhikaarRegistry.ProposalType.PublishSnapshot, root, bytes32(0));
        assertEq(registry.getInstitution(institutionId).currentSnapshotRoot, root);
    }

    function testRevokedInstitutionIsInactive() public {
        registerInstitution();
        proposeAndApprove(AdhikaarRegistry.ProposalType.Revoke, keccak256("revoke"), bytes32(0));
        AdhikaarRegistry.Institution memory institution = registry.getInstitution(institutionId);
        assertFalse(institution.active);
        assertTrue(institution.revoked);
    }

    function testMalformedZeroHashesRejected() public {
        vm.prank(validatorOne);
        vm.expectRevert(AdhikaarRegistry.ZeroValue.selector);
        registry.propose(AdhikaarRegistry.ProposalType.Register, bytes32(0), keyHash, metadataHash);
    }

    function testReexecutionRejected() public {
        vm.prank(validatorOne);
        bytes32 id = registry.propose(AdhikaarRegistry.ProposalType.Register, institutionId, keyHash, metadataHash);
        vm.prank(validatorOne);
        registry.approve(id);
        vm.prank(validatorTwo);
        registry.approve(id);
        vm.prank(validatorThree);
        vm.expectRevert(AdhikaarRegistry.ProposalAlreadyExecuted.selector);
        registry.approve(id);
    }

    function testEventsContainOnlyHashesAndAddresses() public {
        vm.recordLogs();
        registerInstitution();
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertGt(entries.length, 0);
        for (uint256 i; i < entries.length; ++i) {
            assertTrue(entries[i].data.length % 32 == 0);
        }
    }

    function testPreviousEventsRemainQueryable() public {
        registerInstitution();
        vm.roll(block.number + 1);
        proposeAndApprove(AdhikaarRegistry.ProposalType.PublishPolicyRoot, keccak256("next-root"), bytes32(0));
        assertGt(registry.getInstitution(institutionId).updatedBlock, 0);
    }
}
