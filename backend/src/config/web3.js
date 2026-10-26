const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL || 'http://127.0.0.1:7545';
const provider = new ethers.JsonRpcProvider(providerUrl);

let votingContract = null;
let contractAddress = process.env.CONTRACT_ADDRESS;
let deployerWallet = null; // Will be resolved dynamically as the first Ganache signer

// Path to Truffle compilation output
const artifactPath = path.resolve(__dirname, '../../../blockchain/build/contracts/VotingSystem.json');

async function initWeb3() {
  try {
    // Check connection
    const network = await provider.getNetwork();
    console.log(`Connected to blockchain network: ID ${network.chainId} at ${providerUrl}`);

    // Resolve the pre-funded Ganache Account 0 dynamically to deploy contract and fund voters
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts found on the Ganache node. Make sure Ganache is running.");
    }
    
    // Get the signer for Account 0
    deployerWallet = await provider.getSigner(accounts[0].address);
    console.log(`Resolved primary Ganache deployer/admin account: ${accounts[0].address}`);

    if (contractAddress && contractAddress !== "") {
      console.log(`Using configured contract address: ${contractAddress}`);
      loadContractInstance(contractAddress);
      await initializeContractRoles(votingContract, accounts);
    } else if (process.env.AUTO_DEPLOY === 'true') {
      console.log('No contract address configured. Attempting auto-deployment...');
      await autoDeployContract();
      await initializeContractRoles(votingContract, accounts);
    } else {
      console.warn('Warning: No contract address configured, and AUTO_DEPLOY is false. Blockchain interactions will fail.');
    }
  } catch (error) {
    console.error('Error connecting to blockchain provider. Verify Ganache is running:', error.message);
  }
}

async function initializeContractRoles(contractInstance, accounts) {
  try {
    if (!contractInstance) return;
    console.log("Initializing on-chain roles for Operator and Emergency Committee...");
    
    // Check current Operator (Account 1) role on-chain
    const operatorAddress = accounts[1].address;
    const currentOperatorRole = await contractInstance.userRoles(operatorAddress);
    
    // Role enum: Public = 0, Operator = 1, Administrator = 2, Emergency = 3
    if (Number(currentOperatorRole) !== 1) {
      console.log(`Setting Operator role for account ${operatorAddress}...`);
      const tx1 = await contractInstance.setRole(operatorAddress, 1);
      await tx1.wait();
    }
    
    // Set Emergency Committee (Accounts 2, 3, 4)
    const committee = await contractInstance.getEmergencyCommittee();
    if (committee.length === 0) {
      console.log(`Setting Emergency Committee members (Accounts 2, 3, 4)...`);
      const tx2 = await contractInstance.setEmergencyCommittee([
        accounts[2].address,
        accounts[3].address,
        accounts[4].address
      ]);
      await tx2.wait();
    }
    console.log("✅ On-chain roles initialized successfully.");
  } catch (err) {
    console.error("Warning: Failed to initialize on-chain roles:", err.message);
  }
}

function loadContractInstance(addr) {
  try {
    if (!fs.existsSync(artifactPath)) {
      console.error(`Smart contract compilation artifact not found at ${artifactPath}. Please run "truffle compile" inside the blockchain directory first.`);
      return;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    votingContract = new ethers.Contract(addr, artifact.abi, deployerWallet);
    contractAddress = addr;
    console.log(`Contract instance successfully loaded at: ${addr}`);
  } catch (error) {
    console.error('Error loading contract instance:', error.message);
  }
}

async function autoDeployContract() {
  try {
    if (!fs.existsSync(artifactPath)) {
      console.warn(`Smart contract artifact not found at ${artifactPath}. Cannot auto-deploy. Please run "truffle compile" inside the blockchain folder first.`);
      return;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    console.log('Deploying VotingSystem contract to Ganache...');
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployerWallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    contractAddress = await contract.getAddress();
    votingContract = contract;
    
    console.log('====================================================');
    console.log(`SUCCESS: Smart contract auto-deployed successfully!`);
    console.log(`Address: ${contractAddress}`);
    console.log('====================================================');

    // Update .env file with deployed address if writable
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Updated backend/.env with the newly deployed contract address.');
    }
  } catch (error) {
    console.error('Contract auto-deployment failed:', error.message);
  }
}

function getContract() {
  if (!votingContract) {
    throw new Error('Voting contract is not initialized. Ensure Ganache is running and contract is deployed.');
  }
  return votingContract;
}

function getProvider() {
  return provider;
}

// Helper to resolve pre-funded unlocked accounts dynamically based on user roles
async function getSignerForRole(role, username) {
  const accounts = await provider.listAccounts();
  if (accounts.length < 5) {
    // Fallback to deployer if Ganache has fewer than 5 accounts
    return deployerWallet;
  }
  
  if (role === 'administrator') {
    return await provider.getSigner(accounts[0].address);
  } else if (role === 'operator') {
    return await provider.getSigner(accounts[1].address);
  } else if (role === 'emergency') {
    if (username === 'emergency2') {
      return await provider.getSigner(accounts[3].address);
    } else if (username === 'emergency3') {
      return await provider.getSigner(accounts[4].address);
    } else {
      // Default to emergency1
      return await provider.getSigner(accounts[2].address);
    }
  }
  return deployerWallet;
}

module.exports = {
  initWeb3,
  getContract,
  getProvider,
  contractAddress: () => contractAddress,
  getDeployerWallet: () => deployerWallet,
  getSignerForRole
};
