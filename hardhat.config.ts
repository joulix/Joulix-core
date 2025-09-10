import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      chainId: 80002, // Polygon Amoy testnet
      accounts: process.env.PRIVATE_KEY_DEPLOYER
        ? [process.env.PRIVATE_KEY_DEPLOYER]
        : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};

export default config;
