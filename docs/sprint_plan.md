# Project Sprint Planning & Milestones

This sprint plan lists the development timeline for the **Blockchain-Based AI-Integrated Online Voting System** across a 12-week development cycle for the Final Year Project (FYP).

---

## 1. Development Milestones Diagram

```
[Design & Planning] ➔ [Smart Contracts] ➔ [AI microservice] ➔ [Backend REST Hub] ➔ [React Frontend] ➔ [Testing & Handover]
     Weeks 1-2            Weeks 3-4          Weeks 5-6          Weeks 7-8         Weeks 9-10          Weeks 11-12
```

---

## 2. Sprint Schedule

### Sprint 1: Architecture Design & Functional Specifications (Weeks 1–2)
- **Objectives:** Domain analysis, gathering requirements, mapping out context and level-0 DFD diagrams.
- **Deliverables:** Functional Specification document, ERD database design, Figma high-fidelity prototypes.

### Sprint 2: Smart Contract & Access Tiers Engineering (Weeks 3–4)
- **Objectives:** Implement role permissions, voter registrations, ballot casting, and multi-sig emergency controls in Solidity.
- **Deliverables:** Solidity contract source files, Truffle compilation setups, and local Ganache migrations testing.

### Sprint 3: AI Fraud Detection & Verification Microservice (Weeks 5–6)
- **Objectives:** Code python endpoints for face similarity, biometric duplicate detection, and IsolationForest threat logging.
- **Deliverables:** FastAPI/Flask Python app, opencv biometrics pipeline, and sklearn classifier training scripts.

### Sprint 4: Backend REST Integration Server (Weeks 7–8)
- **Objectives:** Set up SQLite schemas, configure JWT session logins, and bridge transaction signatures to Ganache using Ethers.js.
- **Deliverables:** Node.js Express server, auth routers, election transaction controllers, and SQLite database initializers.

### Sprint 5: React Glassmorphic Dashboards (Weeks 9–10)
- **Objectives:** Build responsive frontend screens (Voter, Administrator, Fraud, Explorer views) using glassmorphism.
- **Deliverables:** Vite + React single-page app, modular page components, canvas-based webcam simulators, and Web3 connection indicators.

### Sprint 6: System Integration, Compliance & Handover (Weeks 11–12)
- **Objectives:** End-to-end user tests, simulating IP/device threat vectors to test the anomaly logs, and compiling thesis documents.
- **Deliverables:** Integrated system verification tests, policy frameworks compliance files, and final project demonstration guides.
