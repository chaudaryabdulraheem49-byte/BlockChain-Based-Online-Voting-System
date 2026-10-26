# Blockchain-Based Online Voting System with Real-Time AI Anomaly Detection

This project is a Proof-of-Concept (PoC) web application developed for the BS Information Technology Final Year Project (FYP) context (Session 2022–2026). It combines Ethereum smart contracts, Python FastAPI machine learning services, and React glassmorphic dashboards to deliver a secure, transparent, and auditable online voting system.

---

## 📂 Project Directory Structure

```
blockchain_voting_system/
├── .vscode/                            # VS Code launch profiles
│   └── launch.json                     # Multi-service start profile configuration
├── blockchain/                         # Solidity smart contracts (EVM)
│   ├── contracts/
│   │   ├── AccessControl.sol           # 4-tier roles & multi-sig emergency overrides
│   │   └── VotingSystem.sol            # Ballot registration, casting & pause hooks
│   ├── migrations/
│   │   └── 1_deploy_voting_system.js   # Truffle migration file
│   └── truffle-config.js               # Network settings connecting to Ganache
├── ai_service/                         # Python AI Microservice (port 5000)
│   ├── app/
│   │   ├── main.py                     # API routers (biometrics, threat features)
│   │   └── models.py                   # OpenCV biometric matches & IsolationForest ml
│   ├── requirements.txt                # Python libraries dependencies list
│   └── run.py                          # Uvicorn boot script
├── backend/                            # Node.js Express Server (port 4000)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # SQLite tables configuration & seeder
│   │   │   └── web3.js                 # Ethers.js transaction signer & auto-deployer
│   │   └── routes/
│   │       ├── auth.js                 # Credentials checks & biometric validation calls
│   │       ├── elections.js            # Vote ledger postings & blockchain explorer API
│   │       └── fraud.js                # AI flag ticket tracking & emergency requests
│   ├── .env                            # Server configuration file
│   ├── package.json                    # Backend npm dependencies
│   └── src/server.js                   # Server entrypoint
├── frontend/                           # React Single-Page Application (port 3000)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx                # Login form & features comparisons matrix
│   │   │   ├── Register.jsx            # Dynamic canvas-based biometric face scanner
│   │   │   ├── VoterDashboard.jsx      # Ballot casting with biometric gates
│   │   │   ├── AdminDashboard.jsx      # On-chain election creation & candidate list
│   │   │   ├── FraudDashboard.jsx      # Real-time AI alerts & multi-sig controls
│   │   │   └── Explorer.jsx            # Public block height & transaction lookup
│   │   ├── App.jsx                     # Route coordinator & context states
│   │   ├── index.css                   # Glassmorphic dark styling design variables
│   │   └── main.jsx                    # React bootloader
│   ├── index.html                      # Root HTML shell linking Google Typography
│   ├── package.json                    # React app npm dependencies
│   └── vite.config.js                  # Vite server port setting
└── docs/                               # Formal FYP Documentation
    ├── policy_framework.md             # Governance framework and checklists
    ├── system_architecture.md          # Context, DFD, and ERD Mermaid source
    └── sprint_plan.md                  # 12-week development schedule
```

---

## 🚀 Running in Visual Studio Code

### Prerequisites
1. **Node.js** (v18 or higher) installed on your system.
2. **Python** (v3.9 or higher) installed on your system.
3. **Ganache** running locally on port `7545` (GUI Quickstart) or `8545` (Ganache-cli).
4. **VS Code** with the **Python** extension installed.

### Startup Steps

1. **Open the Project Folder:**
   - Launch Visual Studio Code.
   - Go to `File` ➔ `Open Folder...`
   - Select the project root folder:
     `C:\Users\Khan\.gemini\antigravity\scratch\blockchain_voting_system`

2. **Run One-Click Launch Profile:**
   - In VS Code, open the **Run & Debug** side panel (shortcut: `Ctrl+Shift+D`).
   - From the drop-down menu at the top, select **`🚀 Run Full Stack (AI + Backend + Frontend)`**.
   - Press the green **Start Debugging** arrow (or press `F5`).
   - *This will automatically launch three separate integrated terminals in VS Code, starting the Python AI service, the Node Express backend, and the Vite React frontend simultaneously!*

3. **Interact in Browser:**
   - Open your browser and navigate to: **`http://127.0.0.1:3000`**

---

## 🧪 Seeding & Test Credentials

The database is pre-seeded on startup with the following credentials to simplify evaluation:

| Role | Username | Password | Wallet Key Account (Ganache) |
|:---|:---|:---|:---|
| **Administrator** | `admin` | `admin123` | Account 0 (`0x90F8b...` - deployer) |
| **Operator** | `operator` | `operator123` | Account 1 (`0xFFcf8...`) |
| **Emergency Committee 1** | `emergency1` | `emergency123` | Account 2 (`0x22d49...`) |
| **Emergency Committee 2** | `emergency2` | `emergency123` | Account 3 (`0xE11BA...`) |
| **Emergency Committee 3** | `emergency3` | `emergency123` | Account 4 (`0xd03ea...`) |
| **Voters** | *Register a new profile* | *Set password* | *Auto-generated on registration* |

---

## 🔍 Detailed Audits & Documentation
For additional technical specifications:
- Review the [policy_framework.md](file:///C:/Users/Khan/.gemini/antigravity/scratch/blockchain_voting_system/docs/policy_framework.md) for full compliance, checklists, and templates.
- Review the [system_architecture.md](file:///C:/Users/Khan/.gemini/antigravity/scratch/blockchain_voting_system/docs/system_architecture.md) for the mermaidContext, Level-0 DFD, and database ERD layouts.
