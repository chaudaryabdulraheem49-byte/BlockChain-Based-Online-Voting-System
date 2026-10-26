const path = require("path");

module.exports = {
  contracts_build_directory: path.join(__dirname, "build/contracts"),
  networks: {
    development: {
      host: process.env.GANACHE_HOST || "127.0.0.1",
      port: 7545, // Ganache GUI default
      network_id: "*", // Match any network id
      gas: 6721975,
      gasPrice: 20000000000
    },
    development_cli: {
      host: process.env.GANACHE_HOST || "127.0.0.1",
      port: 8545, // Ganache CLI / docker default
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000000
    }
  },
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  }
};
