import { ethers } from "ethers";
import deployments from "../contracts/deployments.json";

export const HARDHAT_CHAIN_ID_HEX = "0x7A69"; // 31337 in hex

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install the MetaMask browser extension.");
  }

  // Request MetaMask account access
  await window.ethereum.request({ method: "eth_requestAccounts" });

  // Automatically switch or add Hardhat Localhost (Chain ID 31337)
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: HARDHAT_CHAIN_ID_HEX,
            chainName: "Hardhat Localhost",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Identify role based on deployed addresses
  const roles = deployments.roles;
  let roleLabel = "Public / Guest";
  if (address.toLowerCase() === roles.registrar.toLowerCase()) roleLabel = "Registrar (Admin 1)";
  else if (address.toLowerCase() === roles.dean.toLowerCase()) roleLabel = "Dean (Admin 2)";
  else if (
    address.toLowerCase() === roles.student1.toLowerCase() ||
    address.toLowerCase() === roles.student2.toLowerCase()
  ) {
    roleLabel = "Student / Graduate";
  } else if (address.toLowerCase() === roles.employer.toLowerCase()) {
    roleLabel = "Employer / Verifier";
  } else if (address.toLowerCase() === roles.deployer.toLowerCase()) {
    roleLabel = "Deployer / University Treasury";
  }

  const contracts = {
    eduToken: new ethers.Contract(deployments.contracts.EduToken.address, deployments.contracts.EduToken.abi, signer),
    eduRegistry: new ethers.Contract(deployments.contracts.EduRegistry.address, deployments.contracts.EduRegistry.abi, signer),
    eduDiplomaSBT: new ethers.Contract(deployments.contracts.EduDiplomaSBT.address, deployments.contracts.EduDiplomaSBT.abi, signer),
    transcriptEscrow: new ethers.Contract(deployments.contracts.TranscriptEscrow.address, deployments.contracts.TranscriptEscrow.abi, signer),
  };

  return { provider, signer, address, roleLabel, contracts, deployments };
}