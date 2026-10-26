# Governance & Operational Policy Framework

This document outlines the formal governance, ethical standards, security restrictions, and compliance rules governing the Blockchain-Based AI-Integrated Online Voting System. It bridges the gap between smart contract logic, machine learning auditing, and institutional election management.

---

## 1. Voter Eligibility & Registration Policy

### 1.1 Eligibility Criteria
1. **Age Requirement:** The voter must be at least 18 years of age on or before the designated election day.
2. **Affiliation:** The voter must be a verified member of the constituency (e.g., student roster for university elections, employee registry for corporate boards, or registered voter roll for district pilots).
3. **Disenfranchisement:** The voter must not be legally disenfranchised by judicial decree or active disciplinary suspension.
4. **Identification:** The voter must possess a valid, verifiable government ID (CNIC, Passport) or university registration number.

### 1.2 Registration Workflow
```
[User Input Credentials] ➔ [ID Verification Checks] ➔ [Face Biometrics Alignment]
                                                            │
[On-Chain Registration]  ◀─── [Generate Node Keypair] ◀─────┘
```
1. **Application Submission:** Voter submits legal credentials, password, and national ID.
2. **Deduplication Check:** The AI engine scans biometrics to ensure the physical face is not already tied to another registered ID.
3. **Keypair Allocation:** Upon approval, the backend generates an isolated cryptographic keypair (Ethereum wallet address) and seeds its eligibility.
4. **On-Chain Write:** The operator wallet broadcasts the voter's public wallet address and registration hash onto the Solidity contract ledger.

---

## 2. Blockchain Governance Policy

### 2.1 Consensus Protocol
This Proof-of-Concept utilizes a simulated **Proof of Authority (PoA)** consensus model, suitable for federated university and corporate elections. Node validator authority is delegated strictly to approved institutional guardians.

### 2.2 Access Control Tiers

| Tier Level | Permissions | Roles Assigned |
|:---|:---|:---|
| **1 – Public** | Query block heights, verify transaction receipts, view counts. | Public Voters, Observers |
| **2 – Operator** | Execute voter registration on-chain, seed eligibility hashes. | Registration Officials, Guardians |
| **3 – Administrator** | Deploy smart contracts, configure candidate arrays, set timing windows. | Election Commissioner |
| **4 – Emergency** | Multi-sig override to freeze contract execution. | Emergency Committee (3-of-5 sigs) |

> [!IMPORTANT]
> The **Emergency Committee** is a designated board of 5 trusted institutional keys. No single admin key has the power to pause or resume contract executions autonomously.

---

## 3. AI Ethics & Governance Policy

### 3.1 Policy Directives

> [!WARNING]
> **Prohibited AI Actions:** The AI anomaly scorer is strictly **prohibited** from autonomously deleting, rejecting, or invalidating any voter's ballot. 
> The system operates under a **Human-in-the-Loop** model.

### 3.2 Human-in-the-Loop Review Workflow
```
[Voter Casts Ballot] ➔ [AI Anomaly Scored > 40%] ➔ [Ballot Written to Ledger]
                                                          │
[Audit Log Resolved] ◀─── [Operator Confirms Status] ◀─── [Fraud flag queued in SQL]
```
1. **Scanning:** A voter casts a ballot. The python service scans network requests and device fingerprints.
2. **Flagging:** If risk parameters exceed 40%, the backend logs a pending flag ticket in SQLite but allows the transaction on-chain.
3. **Review:** A human operator inspects the flag's explainable reason (e.g., "5 votes from same IP within 10 seconds").
4. **Disposition:** The operator marks the flag as *Confirmed Fraud* (requiring manual tribunal challenge) or *False Positive* (resolving the ticket).

---

## 4. Security & Data Privacy Policy

### 4.1 Encrypted Data Retention Rules

| Data Segment | Cryptographic Protocol | Storage Location | Retention Duration |
|:---|:---|:---|:---|
| **Personally Identifiable Info (PII)** | AES-256 Symmetric Hashing | SQLite database | Destroyed 30 days post-election audit |
| **Biometric Face Snapshot** | base64 raw buffer | SQLite database | Destroyed 30 days post-election audit |
| **Voter Wallet Address** | Keccak-256 Public Key | Blockchain Ledger | Permanent (Immutable) |
| **Vote Selection Tally** | Decoupled transactions | Blockchain Ledger | Permanent (Immutable) |
| **AI System Logs** | SHA-256 Audit Trail | SQLite database | Retained for 1 Year |

---

## 5. Election Lifecycle Management Policy

### 5.1 Pre-Election Phase
- **T - 15 Days:** Smart contract deployment and security configuration audits.
- **T - 10 Days:** Candidate registrations close; voter registration logs finalized.
- **T - 2 Days:** Mock election run on local Ganache network to audit state machine logs.

### 5.2 During-Election Phase
- Smart contract automatically gates vote casting by comparing `block.timestamp` against the start and end times.
- Real-time audit telemetry updates block numbers and transaction feeds.

### 5.3 Post-Election Phase
- Smart contract tallies are queried publicly.
- A 14-day challenge window opens for candidates to review transaction logs.
- Official certification published by the Commissioner.

---

## 6. Audit & Compliance Policy

- **Internal Audits:** Daily automated ledger hash integrity verification checks.
- **External Audits:** At least one pre-election independent audit of the contract bytecode and python code.
- **Public Verifiability:** Every voter receives a transaction hash receipt, enabling them to verify their vote is logged inside the target block.

---

## 7. Incident Response & Dispute Resolution Policy

### 7.1 Severity Severity Matrix

| Severity Tier | Definition / Example | Targeted Response Time | Emergency Protocol |
|:---|:---|:---|:---|
| **Critical** | Block re-orgs, contract re-entrancy hack attempts | Less than 1 Hour | 3-of-5 Multi-Sig pause contract execution. |
| **High** | AI face microservice down | Less than 4 Hours | Route biometric gates to temporary fail-safe bypass. |
| **Medium** | Slow block validation times | Less than 24 Hours | Scale Ganache/rpc provider nodes. |
| **Low** | Explorer display errors | 7 Days | Visual hotfix updates. |

---

## 8. Policy Enforcement & Review

- **Compliance Auditing:** Annual review of the database logs and AI models bias checks.
- **Sanction Policy:** Minor infractions (warning), moderate (system access suspension), critical (legal prosecution referral).

---

## Glossary

- **Blockchain:** A decentralized, distributed ledger that records transactions immutably.
- **Smart Contract:** Self-executing code stored on-chain that automatically enforces voting parameters.
- **Zero-Knowledge Proof:** A cryptographic method allowing one party to prove they possess a credential without revealing the secret itself.
- **Multi-Signature (Multi-Sig):** Cryptographic arrangement requiring multiple private keys to authorize highly sensitive operations (e.g., system pause).
- **Proof of Authority:** A consensus mechanism in private chains where validator status is delegated to pre-approved accounts.
- **Sybil Attack:** A network attack where a malicious agent attempts to subvert validation by forging fake registrations.

---

## Appendices

### Appendix A: Smart Contract Deployment Audit Checklist
- [ ] Compiler version locked at `0.8.20`.
- [ ] Access modifiers check: `onlyAdmin` and `onlyOperator` functions double-checked.
- [ ] Emergency `isPaused` state modifier is inherited by all write methods.
- [ ] Re-entrancy guards implemented on all value modifications.

### Appendix B: Incident Report Template
```
Ticket ID: [INC-YYYYMMDD-XX]
Incident Severity: [Critical / High / Medium / Low]
Detected Time: [ISO Timestamp]
Trigger Source: [AI Auto-Flag / Operator Report]
System Status: [Running / Paused via Multi-Sig]
Resolution Details: [Write actions taken]
```

### Appendix C: Voter Biometric Registration Verification Form
```
Voter Name: ____________________
National ID: ___________________
Allocated Wallet: ____________________________________
Registrar Verification:
- ID Checked: [Yes/No]
- Biometric Deduplication Confirmed: [Yes/No]
- Blockchain Tx Hash: _________________________________
```
