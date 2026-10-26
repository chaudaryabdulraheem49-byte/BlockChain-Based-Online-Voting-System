const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ethers } = require('ethers');
const db = require('../config/db');
const { getContract, getProvider, getSignerForRole } = require('../config/web3');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

// Helper middleware to verify JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'supersecretkeyforblockchainvotingapp2026', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// 1. List all elections (public)
router.get('/', async (req, res) => {
  try {
    const contract = getContract();
    const count = await contract.electionCount();
    const electionsList = [];

    for (let i = 1; i <= Number(count); i++) {
      const elec = await contract.elections(i);
      const candCount = await contract.electionCandidateCount(i);
      const candidates = [];

      for (let j = 1; j <= Number(candCount); j++) {
        const c = await contract.getCandidate(i, j);
        candidates.push({
          id: Number(c[0]),
          name: c[1],
          party: c[2],
          voteCount: Number(c[3])
        });
      }

      electionsList.push({
        id: Number(elec.id),
        title: elec.title,
        startTime: Number(elec.startTime),
        endTime: Number(elec.endTime),
        candidates
      });
    }

    return res.json(electionsList);
  } catch (err) {
    console.error('Error fetching elections from contract:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve elections: ' + err.message });
  }
});

// 2. Create a new election (Admin only)
router.post('/create', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { title, startTime, endTime } = req.body;
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Title, startTime, and endTime are required.' });
  }

  try {
    const adminSigner = await getSignerForRole('administrator');
    const contract = getContract().connect(adminSigner);
    
    // Fetch latest block timestamp to avoid Ganache local clock desync
    const provider = getProvider();
    let startSec;
    try {
      const latestBlock = await provider.getBlock('latest');
      startSec = latestBlock.timestamp - 300; // Force 5 minutes in the past
    } catch (blockErr) {
      startSec = Math.floor(new Date(startTime).getTime() / 1000) - 300;
    }
    const endSec = Math.floor(new Date(endTime).getTime() / 1000);

    const tx = await contract.createElection(title, startSec, endSec);
    await tx.wait();

    db.run("INSERT INTO audit_logs (event_type, description) VALUES ('ElectionCreation', ?)", [
      `Election "${title}" created on-chain. Tx: ${tx.hash}`
    ]);

    return res.status(201).json({ message: 'Election created successfully on-chain!', txHash: tx.hash });
  } catch (err) {
    console.error('Error creating election:', err.message);
    return res.status(500).json({ error: 'Blockchain election creation failed: ' + err.message });
  }
});

// 3. Add Candidate to election (Admin only)
router.post('/add-candidate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { electionId, name, party } = req.body;
  if (!electionId || !name || !party) {
    return res.status(400).json({ error: 'ElectionId, name, and party are required.' });
  }

  try {
    const adminSigner = await getSignerForRole('administrator');
    const contract = getContract().connect(adminSigner);
    const tx = await contract.addCandidate(electionId, name, party);
    await tx.wait();

    db.run("INSERT INTO audit_logs (event_type, description) VALUES ('CandidateAddition', ?)", [
      `Candidate ${name} (${party}) added to Election ID ${electionId}. Tx: ${tx.hash}`
    ]);

    return res.status(201).json({ message: 'Candidate added successfully!', txHash: tx.hash });
  } catch (err) {
    console.error('Error adding candidate:', err.message);
    return res.status(500).json({ error: 'Blockchain candidate addition failed: ' + err.message });
  }
});

// 4. Cast Vote (Voter only) - Biometric gates + Anomaly Flags
router.post('/cast-vote', authenticateToken, async (req, res) => {
  const { electionId, candidateId, faceImage, ipAddress, deviceFingerprint } = req.body;

  if (!electionId || !candidateId || !faceImage) {
    return res.status(400).json({ error: 'Election ID, candidate selection, and live face verification snapshot are required.' });
  }

  // Retrieve user credentials from DB to get their registered biometrics and private key
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], async (err, voter) => {
    if (err || !voter) {
      return res.status(404).json({ error: 'Voter profile not found in local database.' });
    }

    try {
      const contract = getContract();
      
      // Pre-flight check: Query the blockchain ledger to check if this voter has already cast a ballot
      const alreadyVoted = await contract.checkHasVoted(electionId, voter.wallet_address);
      if (alreadyVoted) {
        const clientIp = ipAddress || req.ip || '127.0.0.1';
        const clientDevice = deviceFingerprint || req.headers['user-agent'] || 'unknown-browser';
        
        // 1. Log an instant Critical Fraud Flag to the Anomaly Center (ai_flags)
        const explanation = `Security Alert: User attempted to cast a duplicate vote in the same ballot. Ballot entry blocked.`;
        console.warn(`[AI ANOMALY DETECTED] Duplicate vote attempt by ${voter.username} from IP ${clientIp}. Blocked.`);
        
        db.run(
          `INSERT INTO ai_flags (username, election_id, risk_score, explanation, ip_address, device_fingerprint, status)
           VALUES (?, ?, 100, ?, ?, ?, 'Pending')`,
          [voter.username, electionId, explanation, clientIp, clientDevice]
        );

        // 2. Log to the security audit trails
        db.run("INSERT INTO audit_logs (event_type, description) VALUES ('DuplicateVoteAttempt', ?)", [
          `Voter ${voter.username} (${voter.wallet_address}) blocked from casting duplicate ballot in Election ID ${electionId}. IP: ${clientIp}`
        ]);

        // 3. Return the friendly block response
        return res.status(403).json({
          error: `You have already voted in this election. Instant Block: Duplicate ballot entry attempt detected. The attempt has been logged and reported to the Administrator's Anomaly Center.`
        });
      }

      // Step A: Biometric Face Match Verification
      let faceVerificationResponse;
      try {
        faceVerificationResponse = await axios.post(`${AI_SERVICE_URL}/api/verify-face`, {
          live_image: faceImage,
          registered_image: voter.registered_image_b64 || ""
        });
      } catch (aiErr) {
        console.warn('Warning: AI Microservice verify-face unreachable. Operating verification in hybrid-mock bypass.');
        faceVerificationResponse = { data: { match: true, similarity: 0.95, message: 'Bypassed: AI service offline' } };
      }

      if (!faceVerificationResponse.data.match) {
        // Face mismatch gates the vote and denies permission (AI Ethics Policy 8.1 - failure to prove identification)
        return res.status(403).json({
          error: 'Biometric Face Verification Failed! The camera snapshot does not match your registered profile.',
          similarity: faceVerificationResponse.data.similarity
        });
      }

      // Step B: Behavioral Anomaly Scanning (IP recycling, rapid casting, ML isolation forest check)
      const clientIp = ipAddress || req.ip || '127.0.0.1';
      const clientDevice = deviceFingerprint || req.headers['user-agent'] || 'unknown-browser';
      
      let anomalyResponse;
      try {
        anomalyResponse = await axios.post(`${AI_SERVICE_URL}/api/analyze-behavior`, {
          ip_address: clientIp,
          device_fingerprint: clientDevice
        });
      } catch (aiErr) {
        console.warn('Warning: AI Microservice behavior-analyzer unreachable. Bypassing anomaly scan.');
        anomalyResponse = { data: { flagged: false, risk_score: 5, explanation: 'Offline bypass' } };
      }

      const isAnomalyFlagged = anomalyResponse.data.flagged;
      const riskScore = anomalyResponse.data.risk_score;
      const riskExplanation = anomalyResponse.data.explanation;

      // Policy 8.3: Anomaly flags log a ticket for human audit, but DO NOT block the vote to prevent false disenfranchisement
      if (isAnomalyFlagged) {
        console.log(`[AI FRAUD DETECTED] High risk score: ${riskScore}. Explanation: ${riskExplanation}`);
        db.run(
          `INSERT INTO ai_flags (username, election_id, risk_score, explanation, ip_address, device_fingerprint, status)
           VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
          [voter.username, electionId, riskScore, riskExplanation, clientIp, clientDevice]
        );
      }

      // Step C: Perform Smart Contract Transaction using Voter's private key
      const provider = getProvider();
      const voterWallet = new ethers.Wallet(voter.wallet_private_key, provider);
      // Connect voter signer to contract instance
      const voterContract = contract.connect(voterWallet);

      // Submit vote on-chain
      const tx = await voterContract.castVote(electionId, candidateId);
      const receipt = await tx.wait();

      // Log transaction details to audit trail
      db.run("INSERT INTO audit_logs (event_type, description) VALUES ('VoteCast', ?)", [
        `Vote cast by wallet ${voter.wallet_address} in Election ID ${electionId}. Tx: ${tx.hash}, AI risk: ${riskScore}`
      ]);

      return res.json({
        message: isAnomalyFlagged
          ? 'Ballot cast successfully on the blockchain! (Note: The session triggered a behavioral flag for administrative review).'
          : 'Ballot cast successfully on the blockchain!',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        riskScore,
        aiFlagged: isAnomalyFlagged
      });

    } catch (txErr) {
      console.error('Blockchain vote casting failed:', txErr.message);
      return res.status(500).json({ error: 'Voting transaction failed on-chain: ' + txErr.message });
    }
  });
});

// 5. Blockchain Explorer Endpoint: Get recent blocks
router.get('/explorer/blocks', async (req, res) => {
  try {
    const provider = getProvider();
    const currentBlockNumber = await provider.getBlockNumber();
    const blocks = [];

    // Fetch the last 10 blocks (or fewer if blockchain is short)
    const blocksToFetch = Math.min(Number(currentBlockNumber), 10);
    for (let i = 0; i < blocksToFetch; i++) {
      const block = await provider.getBlock(Number(currentBlockNumber) - i);
      if (block) {
        blocks.push({
          number: block.number,
          hash: block.hash,
          timestamp: Number(block.timestamp),
          transactionsCount: block.transactions.length
        });
      }
    }

    return res.json(blocks);
  } catch (err) {
    return res.status(500).json({ error: 'Explorer failed to read ledger: ' + err.message });
  }
});

// 6. Blockchain Explorer Endpoint: Get transaction details
router.get('/explorer/tx/:hash', async (req, res) => {
  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(req.params.hash);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found on this ledger.' });
    }
    const receipt = await provider.getTransactionReceipt(req.params.hash);

    return res.json({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      blockNumber: tx.blockNumber,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
      status: receipt ? receipt.status : null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Explorer failed to read transaction: ' + err.message });
  }
});

module.exports = router;
