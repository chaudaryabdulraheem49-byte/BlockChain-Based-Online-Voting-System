const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const { initWeb3, contractAddress } = require('./config/web3');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS and JSON body parsers
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large base64 image snapshots

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    contractAddress: contractAddress() || 'not_deployed',
    timestamp: new Date().toISOString()
  });
});

// Mounting routers
const authRouter = require('./routes/auth');
const electionsRouter = require('./routes/elections');
const fraudRouter = require('./routes/fraud');

app.use('/api/auth', authRouter);
app.use('/api/elections', electionsRouter);
app.use('/api/fraud', fraudRouter);

// Start Server and initialize Web3 connections
app.listen(PORT, async () => {
  console.log(`Backend API Server running on http://127.0.0.1:${PORT}`);
  // Initialize Ethers provider and handle smart contract loading/auto-deployment
  await initWeb3();
});
