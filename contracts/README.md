# Joulix Contracts

Smart contracts for tokenizing green energy certificates (GoO) and running a marketplace.

## 📦 Tech stack

- Solidity – smart contracts
- Hardhat – development & testing
- OpenZeppelin – security & standards
- TypeScript – scripts & tests

---

## 🚀 Quickstart

1. Install dependencies
   npm install

2. Configure environment
   Skopiuj .env.example do .env i uzupełnij zmienne:

   cp .env.example .env

   Required:
   - AMOY_RPC_URL – RPC URL for Polygon Amoy testnet (np. https://rpc-amoy.polygon.technology/)
   - PRIVATE_KEY_DEPLOYER – private key z prefixem 0x (test-only)
   - ETHERSCAN_API_KEY – Etherscan v2 API key (używany także dla Polygonscan)

   Optional (fallback = deployer):
   - ADMIN, ISSUER, TREASURY – adresy ról/skarbonki
   - FEE_BPS – fee w bps (domyślnie 200 = 2%)

3. Compile contracts
   npx hardhat compile

4. Run tests
   npx hardhat test

5. Static analysis
   slither . --solc-remaps @openzeppelin=node_modules/@openzeppelin

6. Deploy to Polygon Amoy
   npx hardhat run deploy-amoy.ts --network amoy --no-compile

7. Verify on Polygonscan (optional)

   USDCmock (no constructor args):
   npx hardhat verify --network amoy 0x088bf8ba2A2bcE6bD799d8A2b797D6299a3D8819

   CarbonLedgerGoO (baseURI, admin, issuer):
   npx hardhat verify --network amoy 0x38689CC4389104C52F15e36A1B08A328b324223F "https://joulix.io/meta/{id}.json" 0x2121108C3a9138D46584d7384d4D6308615799af 0x2121108C3a9138D46584d7384d4D6308615799af

   MarketplaceUSDC (quote, admin, treasury, feeBps):
   npx hardhat verify --network amoy 0x5190Ca5568000C5468970e89130e886809b98bec 0x088bf8ba2A2bcE6bD799d8A2b797D6299a3D8819 0x2121108C3a9138D46584d7384d4D6308615799af 0x2121108C3a9138D46584d7384d4D6308615799af 200

---

## 📜 Deployed (Polygon Amoy – chainId 80002)

USDCmock        = 0x088bf8ba2A2bcE6bD799d8A2b797D6299a3D8819
CarbonLedgerGoO = 0x38689CC4389104C52F15e36A1B08A328b324223F
MarketplaceUSDC = 0x5190Ca5568000C5468970e89130e886809b98bec

Roles / Accounts:
ADMIN    = 0x2121108C3a9138D46584d7384d4D6308615799af
ISSUER   = 0x2121108C3a9138D46584d7384d4D6308615799af
TREASURY = 0x2121108C3a9138D46584d7384d4D6308615799af
FEE_BPS  = 200

---

## 🖥️ Frontend (dashboard) – env

dashboard/.env.local:

NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology/
NEXT_PUBLIC_USDC_ADDRESS=0x088bf8ba2A2bcE6bD799d8A2b797D6299a3D8819
NEXT_PUBLIC_ERC1155_ADDRESS=0x38689CC4389104C52F15e36A1B08A328b324223F
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x5190Ca5568000C5468970e89130e886809b98bec

---

## 📝 License

This project is licensed under the Business Source License 1.1 (LICENSE).
