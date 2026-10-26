const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { ethers } = require('ethers');
const db = require('../config/db');
const { getContract, getDeployerWallet, getSignerForRole } = require('../config/web3');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforblockchainvotingapp2026';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

// Register Voter (called by voter or registration operator)
router.post('/register', async (req, res) => {
  const { username, password, nationalId, faceImage } = req.body;

  if (!username || !password || !nationalId || !faceImage) {
    return res.status(400).json({ error: 'All fields (username, password, nationalId, faceImage) are required.' });
  }

  // Enforce exactly 13 digits for National ID (CNIC)
  const cleanNationalId = nationalId.replace(/\D/g, '');
  if (cleanNationalId.length !== 13) {
    return res.status(400).json({ error: 'National Identity Number must contain exactly 13 digits.' });
  }

  // 1. Check if user already exists in local DB
  db.get("SELECT id FROM users WHERE username = ? OR national_id = ?", [username, cleanNationalId], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database check failed: ' + err.message });
    }
    if (existingUser) {
      return res.status(400).json({ error: 'Username or National ID is already registered.' });
    }

    try {
      // 2. Call AI Service to verify this biometric image isn't already registered to someone else (Duplicate Detection)
      let duplicateCheckResponse;
      try {
        duplicateCheckResponse = await axios.post(`${AI_SERVICE_URL}/api/check-duplicate`, {
          voter_id: cleanNationalId,
          biometric_image: faceImage
        });
      } catch (aiErr) {
        console.warn('Warning: AI Microservice check-duplicate unreachable. Proceeding with registration (fallback).');
        duplicateCheckResponse = { data: { is_duplicate: false, message: 'Fallback: AI service offline' } };
      }

      if (duplicateCheckResponse.data.is_duplicate) {
        return res.status(400).json({ 
          error: 'Biometric registration rejected: ' + duplicateCheckResponse.data.message 
        });
      }

      // 3. Generate a cryptographic wallet for the voter
      const wallet = ethers.Wallet.createRandom();
      const walletAddress = wallet.address;
      const walletPrivateKey = wallet.privateKey;

      // 4. Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // 5. Call AI Service to save voter's biometric hash registry
      try {
        await axios.post(`${AI_SERVICE_URL}/api/register-biometric`, {
          voter_id: cleanNationalId,
          biometric_image: faceImage
        });
      } catch (aiErr) {
        console.warn('Warning: AI Microservice register-biometric failed. Registry will operate in hybrid-mock mode.');
      }

      // Pre-fund the new voter wallet with 0.1 ETH from Ganache Deployer Account 0 for gas fees
      try {
        const deployer = getDeployerWallet();
        console.log(`Pre-funding voter wallet ${walletAddress} from deployer...`);
        const fundTx = await deployer.sendTransaction({
          to: walletAddress,
          value: ethers.parseEther("0.1")
        });
        await fundTx.wait();
        console.log(`Successfully pre-funded voter wallet.`);
      } catch (fundErr) {
        console.error('Failed to pre-fund voter wallet:', fundErr.message);
        return res.status(500).json({ error: 'Failed to pre-fund voter wallet for transaction gas: ' + fundErr.message });
      }

      // 6. Write Voter details to local SQLite (Separated from ballot recording)
      db.run(
        `INSERT INTO users (username, password, national_id, wallet_address, wallet_private_key, role, registered_image_b64)
         VALUES (?, ?, ?, ?, ?, 'voter', ?)`,
        [username, hashedPassword, cleanNationalId, walletAddress, walletPrivateKey, faceImage],
        async function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Failed to save voter record: ' + insertErr.message });
          }

          // 7. Write Voter Registration to Blockchain Ledger
          try {
            const operatorSigner = await getSignerForRole('operator');
            const contract = getContract().connect(operatorSigner);
            // Generate registration hash (sha256 of nationalId)
            const registrationHash = ethers.keccak256(ethers.toUtf8Bytes(cleanNationalId));
            
            console.log(`Writing registration to blockchain for ${walletAddress} with hash ${registrationHash}`);
            const tx = await contract.registerVoter(walletAddress, registrationHash);
            await tx.wait(); // Wait for transaction confirmation
            
            // Log audit trail
            db.run("INSERT INTO audit_logs (event_type, description) VALUES ('VoterRegistration', ?)", [
              `Voter ${username} registered on-chain. Wallet: ${walletAddress}, Tx: ${tx.hash}`
            ]);

            return res.status(201).json({
              message: 'Voter registered successfully both in Database and on Blockchain!',
              walletAddress,
              txHash: tx.hash
            });
          } catch (txErr) {
            console.error('Blockchain registration transaction failed:', txErr.message);
            // Roll back user insertion from DB to maintain consistency
            db.run("DELETE FROM users WHERE id = ?", [this.lastID]);
            return res.status(500).json({ 
              error: 'Failed to write voter eligibility to blockchain: ' + txErr.message + '. Ganache check required.' 
            });
          }
        }
      );
    } catch (err) {
      console.error('Registration processing error:', err.message);
      return res.status(500).json({ error: 'Server error processing registration: ' + err.message });
    }
  });
});

// Login User
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database search failed: ' + err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        walletAddress: user.wallet_address
      }
    });
  });
});

module.exports = router;
