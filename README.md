# EduVault 🎓

A blockchain-based academic credential system built on Ethereum. Universities issue tamper-proof diplomas and transcripts; anyone can verify them without contacting the institution.

---

## Tech Stack

- **Solidity 0.8.24** + OpenZeppelin — smart contracts
- **Hardhat** — compile, test, deploy
- **React + Vite + ethers.js** — frontend
- **MetaMask** — wallet / role detection

---

## Contracts

| Contract | Role |
|---|---|
| `EduToken` | ERC-20 `$EDU` — utility token for escrow fees |
| `EduRegistry` | Stores Merkle roots of credential batches; 2-of-2 multi-sig (Registrar + Dean) |
| `EduDiplomaSBT` | ERC-721 soulbound diploma NFT — non-transferable |
| `TranscriptEscrow` | Timelocked `$EDU` escrow — released when transcript is fulfilled |

---

## Flow

```
Registrar  ──► proposeBatch(merkleRoot)   ─┐
                                            ├─► Batch ACTIVE on-chain
Dean       ──► approveBatch(merkleRoot)   ─┘
                        │
                        ▼
           EduDiplomaSBT.mint(student, leaf, proof)
                        │
                        ▼
           Anyone ──► verifyCredential(root, leaf, proof)  ✅ / ❌
```

**Transcript escrow side-flow:**

```
Employer deposits $EDU ──► TranscriptEscrow
                                │
        University fulfils ──► release to treasury
           OR
        Employer cancels  ──► refund after timelock
```

---

## Accounts (Hardhat local node)

The deploy script maps the first 6 deterministic Hardhat accounts to roles:

| Index | Role |
|---|---|
| 0 | Deployer / University Treasury |
| 1 | Registrar (Admin 1) |
| 2 | Dean (Admin 2) |
| 3 | Student 1 |
| 4 | Student 2 |
| 5 | Employer / Verifier |

Switch to the matching account in MetaMask to unlock that role's UI.

---

## Setup

### 1. Install dependencies

```bash
# Root (Hardhat)
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure environment

```bash
# Root
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env
```

Edit the `.env` files as needed (private key required only for testnet deploys).

### 3. Start local node

```bash
npx hardhat node
```

### 4. Deploy contracts

In a new terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This auto-generates `frontend/src/contracts/deployments.json`.

### 5. Start frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect MetaMask to **Hardhat Localhost** (Chain ID `31337`, RPC `http://127.0.0.1:8545`).

---

## Project Structure

```
eduvault/
├── contracts/          # Solidity smart contracts
├── scripts/            # deploy.js
├── test/               # Hardhat test files
├── hardhat.config.js
├── .env.example        # Root env template
└── frontend/
    ├── src/
    │   ├── components/ # AdminPanel, StudentPortal, EmployerEscrow, PublicVerifier
    │   ├── contracts/  # deployments.json (auto-generated, gitignored)
    │   └── utils/      # web3.js, merkle.js
    └── .env.example    # Frontend env template
```

---

## Notes

- `artifacts/`, `cache/`, and `deployments.json` are **gitignored** — regenerate them locally after cloning.
- `deployments.json` is auto-written by the deploy script; never edit it by hand.
- All addresses in `deployments.example.json` are zero — they are placeholders only.

