// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract EduRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant DEAN_ROLE = keccak256("DEAN_ROLE");

    struct Batch {
        bytes32 merkleRoot;
        string batchName;
        bool registrarApproved;
        bool deanApproved;
        bool isActive;
        uint256 activatedAt;
    }

    mapping(bytes32 => Batch) public batches;
    bytes32[] public batchRoots;

    event BatchProposed(bytes32 indexed merkleRoot, string batchName, address indexed proposedBy);
    event BatchApproved(bytes32 indexed merkleRoot, address indexed approvedBy, string role);
    event BatchActivated(bytes32 indexed merkleRoot, uint256 timestamp);

    constructor(address registrar, address dean) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, registrar);
        _grantRole(DEAN_ROLE, dean);
    }

    // 1. Registrar proposes a new batch Merkle Root (counts as Registrar's sign-off)
    function proposeBatch(bytes32 merkleRoot, string calldata batchName) external onlyRole(REGISTRAR_ROLE) {
        require(merkleRoot != bytes32(0), "Invalid Merkle Root");
        require(batches[merkleRoot].merkleRoot == bytes32(0), "Batch already proposed");

        batches[merkleRoot] = Batch({
            merkleRoot: merkleRoot,
            batchName: batchName,
            registrarApproved: true,
            deanApproved: false,
            isActive: false,
            activatedAt: 0
        });

        batchRoots.push(merkleRoot);
        emit BatchProposed(merkleRoot, batchName, msg.sender);
        emit BatchApproved(merkleRoot, msg.sender, "REGISTRAR");
    }

    // 2. Dean approves the proposed batch -> completes 2-of-2 multi-sig consensus
    function approveBatch(bytes32 merkleRoot) external onlyRole(DEAN_ROLE) {
        Batch storage batch = batches[merkleRoot];
        require(batch.merkleRoot != bytes32(0), "Batch does not exist");
        require(!batch.deanApproved, "Dean already approved");

        batch.deanApproved = true;
        emit BatchApproved(merkleRoot, msg.sender, "DEAN");

        if (batch.registrarApproved && batch.deanApproved) {
            batch.isActive = true;
            batch.activatedAt = block.timestamp;
            emit BatchActivated(merkleRoot, block.timestamp);
        }
    }

    function isRootActive(bytes32 merkleRoot) external view returns (bool) {
        return batches[merkleRoot].isActive;
    }

    function getAllBatchRoots() external view returns (bytes32[] memory) {
        return batchRoots;
    }

    // 3. Zero-gas SHA-256 Merkle Proof verification (matches merkletreejs SHA-256 sorted pairs)
    function verifyCredential(
        bytes32 merkleRoot,
        bytes32 leaf,
        bytes32[] calldata proof
    ) public view returns (bool) {
        if (!batches[merkleRoot].isActive) {
            return false;
        }

        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = sha256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = sha256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == merkleRoot;
    }
}