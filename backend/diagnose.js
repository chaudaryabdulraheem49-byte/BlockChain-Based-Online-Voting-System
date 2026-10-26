const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL || 'http://127.0.0.1:7545';
console.log('--- Blockchain Diagnostic Tool ---');
console.log('Target RPC Provider:', providerUrl);

const provider = new ethers.JsonRpcProvider(providerUrl);

async function checkConnection() {
  try {
    const network = await provider.getNetwork();
    console.log('✅ Connection Success!');
    console.log('Network Name/ChainId:', network.name, '/', network.chainId.toString());

    console.log('Listing accounts...');
    const accounts = await provider.listAccounts();
    console.log('Accounts array length:', accounts.length);
    if (accounts.length > 0) {
      console.log('First account element:', accounts[0]);
      console.log('Type of first element:', typeof accounts[0]);
      // Print keys/properties
      console.log('Properties:', Object.keys(accounts[0]));
      
      const addr = await accounts[0].getAddress();
      console.log('First account address:', addr);
    }
  } catch (error) {
    console.log('❌ Connection Failed!');
    console.log('Error Message:', error.message);
  }
}

checkConnection();
