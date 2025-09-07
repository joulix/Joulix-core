import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const AMOY_RPC_URL = process.env.AMOY_RPC_URL || "";
const PRIVATE_KEY  = process.env.PRIVATE_KEY_DEPLOYER || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    hardhat: {},
    amoy: {
      url: AMOY_RPC_URL,        // np. Alchemy/Infura Polygon Amoy
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  etherscan: {
    // Możemy dodać klucz do weryfikacji, gdy będzie potrzebny
    apiKey: { polygonAmoy: process.env.POLYGONSCAN_API_KEY || "" }
  }
};

export default config;
