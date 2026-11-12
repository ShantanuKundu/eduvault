import { MerkleTree } from "merkletreejs";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";
import { Buffer } from "buffer";

window.Buffer = Buffer;

function sha256Buffer(data) {
  const wordArray = CryptoJS.lib.WordArray.create(data);
  const hashHex = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
  return Buffer.from(hashHex, "hex");
}

// Base credential hash: sha256(rollNo|name|degree|cgpa)
export function computeCredentialLeaf(student) {
  const rawString = `${student.rollNo}|${student.name}|${student.degree}|${student.cgpa}`;
  const hashHex = CryptoJS.SHA256(rawString).toString(CryptoJS.enc.Hex);
  return "0x" + hashHex;
}

// Wallet-bound leaf matching Solidity: sha256(abi.encodePacked(studentWallet, credentialLeaf))
export function computeBoundLeaf(walletAddress, credentialLeafHex) {
  const packed = ethers.solidityPacked(["address", "bytes32"], [walletAddress, credentialLeafHex]);
  return ethers.sha256(packed);
}

export function buildBatchMerkleTree(students) {
  const records = students.map((s) => {
    const credentialLeaf = computeCredentialLeaf(s);
    const boundLeaf = computeBoundLeaf(s.wallet, credentialLeaf);
    return {
      ...s,
      credentialLeaf,
      boundLeaf,
    };
  });

  const leafBuffers = records.map((r) => Buffer.from(r.boundLeaf.slice(2), "hex"));
  const tree = new MerkleTree(leafBuffers, sha256Buffer, { sortPairs: true });
  const merkleRoot = "0x" + tree.getRoot().toString("hex");

  const recordsWithProofs = records.map((r) => {
    const leafBuf = Buffer.from(r.boundLeaf.slice(2), "hex");
    const proof = tree.getHexProof(leafBuf);
    return {
      ...r,
      proof,
    };
  });

  return { merkleRoot, records: recordsWithProofs };
}