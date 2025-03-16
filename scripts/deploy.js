const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy LandRegistry
  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.deployed();

  console.log("LandRegistry deployed to:", landRegistry.address);

  // Get contract artifacts
  const artifactPath = path.join(__dirname, "../artifacts/contracts/LandRegistry.sol/LandRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Save contract address and ABI to frontend
  const contractData = {
    address: landRegistry.address,
    abi: artifact.abi
  };

  const frontendPath = path.join(__dirname, "../js/contract-config.js");
  fs.writeFileSync(
    frontendPath,
    `const contractAddress = "${landRegistry.address}";\nconst contractABI = ${JSON.stringify(artifact.abi, null, 2)};\n\nexport { contractAddress, contractABI };`
  );

  console.log("Contract configuration saved to:", frontendPath);

  // Verify contract on Etherscan (if on mainnet or testnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await landRegistry.deployTransaction.wait(6);
    
    await hre.run("verify:verify", {
      address: landRegistry.address,
      constructorArguments: [],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
