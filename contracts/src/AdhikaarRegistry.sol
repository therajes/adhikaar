// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ADHIKAAR Consortium Registry
/// @notice Hash-only, two-of-three witnessed trust state for the fictional demo.
contract AdhikaarRegistry {
    enum ProposalType {
        Register,
        RotateKey,
        PublishPolicyRoot,
        PublishRevocationRoot,
        PublishSnapshot,
        Suspend,
        Revoke
    }

    struct Institution {
        bool active;
        bool revoked;
        bytes32 publicKeyHash;
        bytes32 metadataHash;
        bytes32 currentPolicyRoot;
        bytes32 currentRevocationRoot;
        bytes32 currentSnapshotRoot;
        uint64 updatedBlock;
    }

    struct Proposal {
        ProposalType proposalType;
        bytes32 institutionIdHash;
        bytes32 value;
        bytes32 auxiliaryValue;
        uint8 approvalCount;
        bool executed;
    }

    uint8 public constant APPROVAL_THRESHOLD = 2;
    mapping(address => bool) public isValidator;
    address[3] public validators;
    mapping(bytes32 => Institution) private institutions;
    mapping(bytes32 => Proposal) public proposals;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;
    uint256 private proposalNonce;

    event ProposalCreated(
        bytes32 indexed proposalId,
        ProposalType indexed proposalType,
        bytes32 indexed institutionIdHash,
        bytes32 value,
        bytes32 auxiliaryValue
    );
    event ProposalApproved(bytes32 indexed proposalId, address indexed validator, uint8 approvalCount);
    event ProposalExecuted(
        bytes32 indexed proposalId, ProposalType indexed proposalType, bytes32 indexed institutionIdHash
    );
    event InstitutionStateChanged(
        bytes32 indexed institutionIdHash, bool active, bool revoked, bytes32 publicKeyHash, uint64 blockNumber
    );
    event TrustRootPublished(
        bytes32 indexed institutionIdHash, ProposalType indexed rootType, bytes32 root, uint64 blockNumber
    );

    error NotValidator();
    error ZeroValue();
    error DuplicateValidator();
    error DuplicateApproval();
    error ProposalAlreadyExecuted();
    error ProposalMissing();
    error InstitutionAlreadyRegistered();
    error InstitutionMissing();

    modifier onlyValidator() {
        if (!isValidator[msg.sender]) revert NotValidator();
        _;
    }

    constructor(address[3] memory initialValidators) {
        for (uint256 i; i < 3; ++i) {
            if (initialValidators[i] == address(0)) revert ZeroValue();
            for (uint256 j; j < i; ++j) {
                if (initialValidators[i] == initialValidators[j]) revert DuplicateValidator();
            }
            validators[i] = initialValidators[i];
            isValidator[initialValidators[i]] = true;
        }
    }

    function propose(ProposalType proposalType, bytes32 institutionIdHash, bytes32 value, bytes32 auxiliaryValue)
        external
        onlyValidator
        returns (bytes32 proposalId)
    {
        if (institutionIdHash == bytes32(0) || value == bytes32(0)) revert ZeroValue();
        proposalId = keccak256(
            abi.encode(
                block.chainid, address(this), ++proposalNonce, proposalType, institutionIdHash, value, auxiliaryValue
            )
        );
        proposals[proposalId] = Proposal(proposalType, institutionIdHash, value, auxiliaryValue, 0, false);
        emit ProposalCreated(proposalId, proposalType, institutionIdHash, value, auxiliaryValue);
    }

    function approve(bytes32 proposalId) external onlyValidator {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.institutionIdHash == bytes32(0)) revert ProposalMissing();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (hasApproved[proposalId][msg.sender]) revert DuplicateApproval();
        hasApproved[proposalId][msg.sender] = true;
        proposal.approvalCount += 1;
        emit ProposalApproved(proposalId, msg.sender, proposal.approvalCount);
        if (proposal.approvalCount >= APPROVAL_THRESHOLD) {
            proposal.executed = true;
            _execute(proposal);
            emit ProposalExecuted(proposalId, proposal.proposalType, proposal.institutionIdHash);
        }
    }

    function getInstitution(bytes32 institutionIdHash) external view returns (Institution memory) {
        return institutions[institutionIdHash];
    }

    function _execute(Proposal storage proposal) private {
        Institution storage institution = institutions[proposal.institutionIdHash];
        if (proposal.proposalType == ProposalType.Register) {
            if (institution.publicKeyHash != bytes32(0)) revert InstitutionAlreadyRegistered();
            institution.active = true;
            institution.publicKeyHash = proposal.value;
            institution.metadataHash = proposal.auxiliaryValue;
        } else {
            if (institution.publicKeyHash == bytes32(0)) revert InstitutionMissing();
            if (proposal.proposalType == ProposalType.RotateKey) {
                institution.publicKeyHash = proposal.value;
            } else if (proposal.proposalType == ProposalType.PublishPolicyRoot) {
                institution.currentPolicyRoot = proposal.value;
            } else if (proposal.proposalType == ProposalType.PublishRevocationRoot) {
                institution.currentRevocationRoot = proposal.value;
            } else if (proposal.proposalType == ProposalType.PublishSnapshot) {
                institution.currentSnapshotRoot = proposal.value;
            } else if (proposal.proposalType == ProposalType.Suspend) {
                institution.active = false;
            } else if (proposal.proposalType == ProposalType.Revoke) {
                institution.active = false;
                institution.revoked = true;
            }
        }
        institution.updatedBlock = uint64(block.number);
        if (
            proposal.proposalType == ProposalType.PublishPolicyRoot
                || proposal.proposalType == ProposalType.PublishRevocationRoot
                || proposal.proposalType == ProposalType.PublishSnapshot
        ) {
            emit TrustRootPublished(
                proposal.institutionIdHash, proposal.proposalType, proposal.value, uint64(block.number)
            );
        }
        emit InstitutionStateChanged(
            proposal.institutionIdHash,
            institution.active,
            institution.revoked,
            institution.publicKeyHash,
            uint64(block.number)
        );
    }
}

