import { useState } from "react";
import { computeCredentialLeaf, computeBoundLeaf } from "../utils/merkle";

export default function PublicVerifier({ contracts }) {
  const savedBatch = JSON.parse(localStorage.getItem("eduvault_batch") || "{}");
  const sample = savedBatch.records?.[0] || { rollNo: "12", name: "Aniket Gulabrao", degree: "MCA", cgpa: "9.1", wallet: "", proof: [] };

  const [merkleRoot, setMerkleRoot] = useState(savedBatch.merkleRoot || "");
  const [wallet, setWallet] = useState(sample.wallet);
  const [rollNo, setRollNo] = useState(sample.rollNo);
  const [name, setName] = useState(sample.name);
  const [degree, setDegree] = useState(sample.degree);
  const [cgpa, setCgpa] = useState(sample.cgpa);
  const [proofJson, setProofJson] = useState(JSON.stringify(sample.proof || []));
  const [result, setResult] = useState("");

  const handleVerify = async () => {
    try {
      const proof = JSON.parse(proofJson);
      const credLeaf = computeCredentialLeaf({ rollNo, name, degree, cgpa });
      const boundLeaf = computeBoundLeaf(wallet, credLeaf);

      const isValid = await contracts.eduRegistry.verifyCredential(merkleRoot, boundLeaf, proof);
      setResult(
        isValid
          ? "VALID CREDENTIAL: Cryptographically verified against active Ethereum Merkle Root (0 Gas Spent)."
          : "INVALID / TAMPERED CREDENTIAL: Hash does not match on-chain Merkle Root."
      );
    } catch (err) {
      setResult("Verification Error: " + err.message);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}>
      <h3>Public Zero-Gas Credential Verifier</h3>
      <p style={{ fontSize: "0.9em", color: "#555" }}>
        Tip: Try altering the CGPA or Name by even one character to demonstrate tamper detection.
      </p>
      <div style={{ display: "grid", gap: "8px" }}>
        <input placeholder="Batch Merkle Root (0x...)" value={merkleRoot} onChange={(e) => setMerkleRoot(e.target.value)} />
        <input placeholder="Student Wallet Address (0x...)" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <div style={{ display: "flex", gap: "8px" }}>
          <input placeholder="Roll No" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
          <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} />
          <input placeholder="CGPA" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
        </div>
        <textarea rows={3} placeholder="Merkle Proof Array (JSON)" value={proofJson} onChange={(e) => setProofJson(e.target.value)} />
        <button onClick={handleVerify}>Verify Credential On-Chain (0 Gas)</button>
      </div>
      {result && <p style={{ marginTop: "14px", fontWeight: "bold", color: result.startsWith("VALID") ? "green" : "crimson" }}>{result}</p>}
    </div>
  );
}