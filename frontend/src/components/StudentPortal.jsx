import { useState } from "react";

export default function StudentPortal({ address, contracts, deployments }) {
  const [tokenId, setTokenId] = useState(null);
  const [status, setStatus] = useState("");

  const savedBatch = JSON.parse(localStorage.getItem("eduvault_batch") || "{}");
  const studentRecord = savedBatch.records?.find(
    (r) => r.wallet.toLowerCase() === address.toLowerCase()
  );

  const handleClaimSBT = async () => {
    if (!studentRecord) {
      setStatus("No matching record found for connected wallet in the current batch.");
      return;
    }
    try {
      setStatus("Minting ERC-721 Soulbound Diploma...");
      const metadataURI = `data:application/json;utf8,${encodeURIComponent(
        JSON.stringify({
          name: `EduVault Diploma - ${studentRecord.name}`,
          degree: studentRecord.degree,
          cgpa: studentRecord.cgpa,
          soulbound: true,
        })
      )}`;
      const tx = await contracts.eduDiplomaSBT.claimDiploma(
        savedBatch.merkleRoot,
        studentRecord.credentialLeaf,
        studentRecord.proof,
        metadataURI
      );
      await tx.wait();
      const mintedId = await contracts.eduDiplomaSBT.studentTokenId(address);
      setTokenId(mintedId.toString());
      setStatus(`Success! Soulbound Diploma Minted (Token ID #${mintedId.toString()}).`);
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message));
    }
  };

  const handleTestTransfer = async () => {
    try {
      const id = tokenId || (await contracts.eduDiplomaSBT.studentTokenId(address)).toString();
      if (id === "0") {
        setStatus("Claim your diploma first before testing transfer.");
        return;
      }
      setStatus("Attempting to transfer Soulbound NFT to another wallet...");
      const tx = await contracts.eduDiplomaSBT.transferFrom(address, deployments.roles.employer, id);
      await tx.wait();
      setStatus("Unexpected: Transfer succeeded.");
    } catch (err) {
      setStatus("BLOCKED AS EXPECTED: " + (err.reason || "SoulboundToken: Non-transferable diploma"));
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}>
      <h3>Student Credential Portal (ERC-721 Soulbound Diploma)</h3>
      {studentRecord ? (
        <div style={{ background: "#f4f6f8", padding: "12px", borderRadius: "6px", marginBottom: "12px" }}>
          <p><strong>Name:</strong> {studentRecord.name} (Roll No: {studentRecord.rollNo})</p>
          <p><strong>Degree:</strong> {studentRecord.degree} | <strong>CGPA:</strong> {studentRecord.cgpa}</p>
          <p><strong>Credential Leaf:</strong> <code>{studentRecord.credentialLeaf}</code></p>
        </div>
      ) : (
        <p>Switch MetaMask to a registered Student wallet (e.g., Student 1) after batch generation.</p>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleClaimSBT} disabled={!studentRecord}>Claim Soulbound Diploma (SBT)</button>
        <button onClick={handleTestTransfer}>Test NFT Transfer (Verify Soulbound Lock)</button>
      </div>

      {status && <p style={{ marginTop: "14px", fontWeight: "bold", color: "#0b5394" }}>{status}</p>}
    </div>
  );
}