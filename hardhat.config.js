require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    // For local development
    hardhat: {
      chainId: 1337
    },
    // For testing on local network
    localhost: {
      url: "http://127.0.0.1:8545"
    }
    // Sepolia network configuration is commented out until proper credentials are provided
    // sepolia: {
    //   url: process.env.SEPOLIA_URL,
    //   accounts: [process.env.PRIVATE_KEY]
    // }
  },
  // Etherscan configuration is commented out until API key is provided
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY
  // },
  paths: {
    artifacts: "./src/artifacts",
  }
};
