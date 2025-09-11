import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const AMOY_RPC_URL = process.env.AMOY_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOYER || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    amoy: {
      url: AMOY_RPC_URL,
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Etherscan V2 (Multichain)
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          // Etherscan V2 — jeden wspólny endpoint
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  // (opcjonalnie) wyłącz komunikat o Sourcify:
  sourcify: { enabled: false },
};

export default config;
