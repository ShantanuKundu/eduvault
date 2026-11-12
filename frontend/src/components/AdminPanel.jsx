import { useState } from "react";
import { buildBatchMerkleTree } from "../utils/merkle";

export default function AdminPanel({ contracts, deployments }) {
  const defaultStudents = JSON.stringify(
    [
      { rollNo: "12", name: "Aniket Gulabrao", degree: "MCA", cgpa: "9.1", wallet: deployments.roles.student1 },
      { rollNo: "23", name: "Abhishek Kar", degree: "MCA", cgpa: "9.0", wallet: deployments.roles.student2 },
      { rollNo: "27", name: "Shantanu Kundu", degree: "MCA", cgpa: "9.2", wallet: deployments.roles.deployer },
    ],
    null,
    2
  );

  const [batchName, setBatchName] = useState("VESIT-MCA-2026");
  const [studentsJson, setStudentsJson] = useState(defaultStudents);
  const [merkleRoot, setMerkleRoot] = useState("");
  const [reqId, setReqId] = useState("1");
  const [transcriptHash, setTranscriptHash] = useState("QmTranscriptSHA256VerifiedHash9981");
  const [status, setStatus] = useState("");

  const handleGenerateTree = () => {
    try {
      const parsed = JSON.parse(studentsJson);
      const { merkleRoot: root, records } = buildBatchMerkleTree(parsed);
      setMerkleRoot(root);
      localStorage.setItem("eduvault_batch", JSON.stringify({ batchName, merkleRoot: root, records }));
      setStatus(`Merkle Tree built! Root: ${root}`);
    } catch (err) {
      setStatus("Invalid JSON: " + err.message);
    }
  };

  const handleProposeBatch = async () => {
    try {
      setStatus("Submitting batch proposal as Registrar...");
      const tx = await contracts.eduRegistry.proposeBatch(merkleRoot, batchName);
      await tx.wait();
      setStatus("Batch proposed by Registrar! Switch MetaMask to Dean and click Approve.");
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
  };

  const handleApproveBatch = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem("eduvault_batch") || "{}");
      const targetRoot = merkleRoot || saved.merkleRoot;
      setStatus("Approving batch as Dean...");
      const tx = await contracts.eduRegistry.approveBatch(targetRoot);
      await tx.wait();
      setStatus(`Batch Approved & Active on-chain! Root: ${targetRoot}`);
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
  };

  const handleFulfillTranscript = async () => {
    try {
      setStatus("Fulfilling transcript request as Registrar...");
      const tx = await contracts.transcriptEscrow.fulfillRequest(reqId, transcriptHash);
      await tx.wait();
      setStatus(`Request #${reqId} fulfilled! 50 $EDU released to University Treasury.`);
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}>
      <h3>University Administration (Registrar & Dean Multi-Sig)</h3>

      <div>
        <label>Batch Name: </label>
        <input value={batchName} onChange={(e) => setBatchName(e.target.value)} />
      </div>
      <br />
      <div>
        <label>Graduating Batch JSON:</label>
        <textarea rows={7} style={{ width: "100%" }} value={studentsJson} onChange={(e) => setStudentsJson(e.target.value)} />
      </div>
      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={handleGenerateTree}>1. Compute SHA-256 Merkle Root</button>
        <button onClick={handleProposeBatch} disabled={!merkleRoot}>2. Propose Batch (Registrar)</button>
        <button onClick={handleApproveBatch}>3. Approve Batch (Dean)</button>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <h4>Fulfill Employer Transcript Request (Registrar Only)</h4>
      <div style={{ display: "flex", gap: "10px" }}>
        <input placeholder="Request ID" value={reqId} onChange={(e) => setReqId(e.target.value)} style={{ width: "90px" }} />
        <input placeholder="Transcript IPFS/SHA256 Hash" value={transcriptHash} onChange={(e) => setTranscriptHash(e.target.value)} style={{ flex: 1 }} />
        <button onClick={handleFulfillTranscript}>Fulfill & Claim $EDU</button>
      </div>

      {status && <p style={{ marginTop: "14px", fontWeight: "bold", color: "#0b5394" }}>{status}</p>}
    </div>
  );
}