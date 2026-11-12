import { useState, useEffect } from "react";
import { connectWallet } from "./utils/web3";
import AdminPanel from "./components/AdminPanel";
import StudentPortal from "./components/StudentPortal";
import EmployerEscrow from "./components/EmployerEscrow";
import PublicVerifier from "./components/PublicVerifier";

export default function App() {
  const [walletState, setWalletState] = useState(null);
  const [activeTab, setActiveTab] = useState("admin");
  const [error, setError] = useState("");

  const handleConnect = async () => {
    try {
      setError("");
      const data = await connectWallet();
      setWalletState(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => handleConnect());
    }
  }, []);

  return (
    <div style={{ maxWidth: "850px", margin: "30px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>EduVault — Web3 Credential Verification</h2>
          <small style={{ color: "#555" }}>Group G25B13 | SHA-256 Merkle Batching • Soulbound ERC-721 • $EDU Escrow</small>
        </div>
        <button onClick={handleConnect} style={{ padding: "10px 16px", cursor: "pointer", fontWeight: "bold" }}>
          {walletState ? "Connected" : "Connect MetaMask"}
        </button>
      </header>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {walletState && (
        <>
          <div style={{ background: "#eef4ff", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px" }}>
            <strong>Active Wallet:</strong> <code>{walletState.address}</code> |{" "}
            <strong>Detected Role:</strong> <span style={{ color: "#0b5394" }}>{walletState.roleLabel}</span>
          </div>

          <nav style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button onClick={() => setActiveTab("admin")}>1. Registrar & Dean</button>
            <button onClick={() => setActiveTab("student")}>2. Student SBT</button>
            <button onClick={() => setActiveTab("employer")}>3. Employer Escrow</button>
            <button onClick={() => setActiveTab("verifier")}>4. Public Verifier</button>
          </nav>

          {activeTab === "admin" && <AdminPanel contracts={walletState.contracts} deployments={walletState.deployments} />}
          {activeTab === "student" && <StudentPortal address={walletState.address} contracts={walletState.contracts} deployments={walletState.deployments} />}
          {activeTab === "employer" && <EmployerEscrow address={walletState.address} contracts={walletState.contracts} deployments={walletState.deployments} />}
          {activeTab === "verifier" && <PublicVerifier contracts={walletState.contracts} />}
        </>
      )}
    </div>
  );
}