import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function EmployerEscrow({ address, contracts, deployments }) {
  const [eduBalance, setEduBalance] = useState("0.0");
  const [studentAddress, setStudentAddress] = useState(
    deployments?.roles?.student1 || "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
  );
  const [timelock, setTimelock] = useState("60");
  const [requestId, setRequestId] = useState("1");
  const [transcriptHash, setTranscriptHash] = useState("");
  const [status, setStatus] = useState("");

  const refreshBalance = async () => {
    try {
      if (!contracts?.eduToken || !address) return;
      const bal = await contracts.eduToken.balanceOf(address);
      setEduBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [address, contracts]);

  const handleFaucet = async () => {
    try {
      setStatus("Requesting 500 Test $EDU from faucet...");
      const tx = await contracts.eduToken.faucet();
      await tx.wait();
      await refreshBalance();
      setStatus("Success! Claimed 500 Test $EDU.");
    } catch (err) {
      setStatus("Faucet Error: " + (err.reason || err.message));
    }
  };

  const handleCreateEscrow = async () => {
    try {
      const fee = ethers.parseEther("50");
      setStatus("Step 1/2: Approving 50 $EDU spend for Escrow...");
      const approveTx = await contracts.eduToken.approve(
        deployments.contracts.TranscriptEscrow.address,
        fee
      );
      await approveTx.wait();

      setStatus("Step 2/2: Locking 50 $EDU in Transcript Escrow...");
      const reqTx = await contracts.transcriptEscrow.requestTranscript(
        studentAddress,
        Number(timelock)
      );
      await reqTx.wait();
      await refreshBalance();
      setStatus(`Escrow Request Created! 50 $EDU locked for student ${studentAddress}.`);
    } catch (err) {
      setStatus("Escrow Error: " + (err.reason || err.message));
    }
  };

  const handleFulfillEscrow = async () => {
    try {
      setStatus("Registrar fulfilling transcript delivery & releasing 50 $EDU...");
      const docHash = ethers.keccak256(
        ethers.toUtf8Bytes(`Official-Transcript-${studentAddress}-${Date.now()}`)
      );
      const tx = await contracts.transcriptEscrow.fulfillRequest(Number(requestId), docHash);
      await tx.wait();
      setTranscriptHash(docHash);
      setStatus(`Fulfilled! Escrow #${requestId} released 50 $EDU to University Treasury.`);
    } catch (err) {
      setStatus("Fulfill Error: " + (err.reason || err.message));
    }
  };

  const handleRefundEscrow = async () => {
    try {
      setStatus("Attempting SLA timeout refund...");
      const tx = await contracts.transcriptEscrow.claimRefund(Number(requestId));
      await tx.wait();
      await refreshBalance();
      setStatus(`Refunded! Escrow #${requestId} expired and 50 $EDU returned to Employer.`);
    } catch (err) {
      setStatus("Refund Blocked / Error: " + (err.reason || err.message));
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px" }}>
      <h3>Employer Credential & Transcript Escrow ($EDU)</h3>
      <p><strong>Your $EDU Balance:</strong> {eduBalance} EDU</p>

      <div style={{ marginBottom: "14px" }}>
        <button onClick={handleFaucet}>Get 500 Test $EDU</button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
        <input
          placeholder="Student Wallet Address (0x...)"
          value={studentAddress}
          onChange={(e) => setStudentAddress(e.target.value)}
        />
        <input
          placeholder="Timelock Duration (seconds)"
          value={timelock}
          onChange={(e) => setTimelock(e.target.value)}
        />
        <button onClick={handleCreateEscrow}>
          Lock 50 $EDU & Request Transcript
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div style={{ display: "grid", gap: "8px" }}>
        <label><strong>Escrow Request ID (for Registrar Fulfillment or Timeout Refund):</strong></label>
        <input
          placeholder="Request ID (e.g., 1)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleFulfillEscrow}>Fulfill Transcript (Registrar)</button>
          <button onClick={handleRefundEscrow}>Claim Timeout Refund (Employer)</button>
        </div>
      </div>

      {transcriptHash && (
        <p style={{ marginTop: "10px", fontSize: "0.9em" }}>
          <strong>Delivered Transcript SHA-256 Hash:</strong> <code>{transcriptHash}</code>
        </p>
      )}
      {status && (
        <p style={{ marginTop: "14px", fontWeight: "bold", color: "#0b5394" }}>{status}</p>
      )}
    </div>
  );
}