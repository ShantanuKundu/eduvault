// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./EduRegistry.sol";

contract EduDiplomaSBT is ERC721URIStorage {
    EduRegistry public registry;
    uint256 private _nextTokenId;

    // Prevents duplicate diploma claims for the same credential leaf
    mapping(bytes32 => bool) public leafClaimed;
    // Maps student address to their minted token ID
    mapping(address => uint256) public studentTokenId;

    event DiplomaMinted(address indexed student, uint256 indexed tokenId, bytes32 indexed merkleRoot);

    constructor(address registryAddress) ERC721("EduVault Soulbound Diploma", "EDUSBT") {
        registry = EduRegistry(registryAddress);
        _nextTokenId = 1;
    }

    // Graduate submits their SHA-256 leaf hash + Merkle Proof to mint their Soulbound Diploma
    function claimDiploma(
        bytes32 merkleRoot,
        bytes32 leaf,
        bytes32[] calldata proof,
        string calldata metadataURI
    ) external returns (uint256) {
        require(registry.isRootActive(merkleRoot), "Merkle root not approved/active");
        require(!leafClaimed[leaf], "Diploma already claimed");
        require(studentTokenId[msg.sender] == 0, "Student already holds a diploma");

        // Bind leaf hash to the caller's wallet address + credential hash so proofs cannot be stolen
        bytes32 expectedBoundLeaf = sha256(abi.encodePacked(msg.sender, leaf));
        require(
            registry.verifyCredential(merkleRoot, expectedBoundLeaf, proof),
            "Invalid Merkle proof or unauthorized wallet"
        );

        leafClaimed[leaf] = true;
        uint256 tokenId = _nextTokenId++;
        studentTokenId[msg.sender] = tokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit DiplomaMinted(msg.sender, tokenId, merkleRoot);
        return tokenId;
    }

    // SOULBOUND ENFORCEMENT: Blocks all transfers after initial minting
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)), revert on any transfer (from != address(0))
        require(from == address(0), "SoulboundToken: Non-transferable diploma");
        return super._update(to, tokenId, auth);
    }
}