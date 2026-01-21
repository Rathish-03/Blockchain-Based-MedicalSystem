const fs = require("fs");
const path = require("path");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",   // Ganache
      port: 7545,          // Ganache GUI default port
      network_id: "*",     // Match any network
      gas: 6721975,        // Set gas explicitly
      gasPrice: 20000000000,
    },
  },

  compilers: {
    solc: {
      version: "0.8.0",   // Match your pragma
    },
  },

  contracts_build_directory: path.join(__dirname, "build/contracts"),

  // Add this hook
  afterDeploy: async () => {
    const source = path.join(__dirname, "build/contracts/HealthcareRecords.json");
    const destination = path.join(__dirname, "../client/src/contracts/HealthcareRecords.json");

    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
      console.log("✅ ABI copied to client/src/contracts/");
    } else {
      console.error("❌ ABI not found at:", source);
    }
  },
};
