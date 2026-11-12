const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Fetch the first 6 deterministic test accounts from Hardhat local node
  const [deployer, registrar, dean, student1, student2, employer] = await hre.ethers.getSigners();

  console.log("====================================================");
  console.log("Deploying EduVault Smart Contracts...");
  console.log("Deployer / Treasury :", deployer.address);
  console.log("Registrar Account   :", registrar.address);
  console.log("Dean Account        :", dean.address);
  console.log("Student 1 Account   :", student1.address);
  console.log("Student 2 Account   :", student2.address);
  console.log("Employer Account    :", employer.address);
  console.log("====================================================\n");

  // 1. Deploy EduToken (ERC-20 $EDU)
  const EduToken = await hre.ethers.getContractFactory("EduToken");
  const eduToken = await EduToken.deploy();
  await eduToken.waitForDeployment();
  const eduTokenAddress = await eduToken.getAddress();
  console.log("1. EduToken ($EDU) deployed to       :", eduTokenAddress);

  // 2. Deploy EduRegistry (Multi-Sig Consensus & Merkle Roots)
  const EduRegistry = await hre.ethers.getContractFactory("EduRegistry");
  const eduRegistry = await EduRegistry.deploy(registrar.address, dean.address);
  await eduRegistry.waitForDeployment();
  const eduRegistryAddress = await eduRegistry.getAddress();
  console.log("2. EduRegistry deployed to           :", eduRegistryAddress);

  // 3. Deploy EduDiplomaSBT (ERC-721 Soulbound Diploma)
  const EduDiplomaSBT = await hre.ethers.getContractFactory("EduDiplomaSBT");
  const eduDiplomaSBT = await EduDiplomaSBT.deploy(eduRegistryAddress);
  await eduDiplomaSBT.waitForDeployment();
  const eduDiplomaSBTAddress = await eduDiplomaSBT.getAddress();
  console.log("3. EduDiplomaSBT deployed to         :", eduDiplomaSBTAddress);

  // 4. Deploy TranscriptEscrow (Timelocked $EDU Escrow Vault)
  const TranscriptEscrow = await hre.ethers.getContractFactory("TranscriptEscrow");
  const transcriptEscrow = await TranscriptEscrow.deploy(
    eduTokenAddress,
    eduRegistryAddress,
    deployer.address // University treasury receives fulfilled transcript fees
  );
  await transcriptEscrow.waitForDeployment();
  const transcriptEscrowAddress = await transcriptEscrow.getAddress();
  console.log("4. TranscriptEscrow deployed to      :", transcriptEscrowAddress);

  // 5. Auto-export ABIs and Contract Addresses to frontend/src/contracts/deployments.json
  const deploymentsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: hre.network.name,
    chainId: 31337,
    roles: {
      deployer: deployer.address,
      registrar: registrar.address,
      dean: dean.address,
      student1: student1.address,
      student2: student2.address,
      employer: employer.address,
    },
    contracts: {
      EduToken: {
        address: eduTokenAddress,
        abi: JSON.parse(eduToken.interface.formatJson()),
      },
      EduRegistry: {
        address: eduRegistryAddress,
        abi: JSON.parse(eduRegistry.interface.formatJson()),
      },
      EduDiplomaSBT: {
        address: eduDiplomaSBTAddress,
        abi: JSON.parse(eduDiplomaSBT.interface.formatJson()),
      },
      TranscriptEscrow: {
        address: transcriptEscrowAddress,
        abi: JSON.parse(transcriptEscrow.interface.formatJson()),
      },
    },
  };

  const outputPath = path.join(deploymentsDir, "deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n✅ Exported ABIs & addresses to:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});