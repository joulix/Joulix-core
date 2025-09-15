# Joulix Dashboard

Frontend for interacting with Joulix smart contracts deployed on Polygon Amoy.

## 📦 Tech stack
- Next.js 15 (React)
- TypeScript
- Tailwind CSS
- shadcn/ui – UI components
- wagmi + ethers.js – Web3 integration

---

## 🚀 Quickstart

### 1. Install dependencies
npm install

### 2. Configure environment
Skopiuj `.env.local.example` do `.env.local`:

cp .env.local.example .env.local

Ustaw zmienne środowiskowe zgodnie z wdrożonymi kontraktami:

NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology/
NEXT_PUBLIC_USDC_ADDRESS=0x088bf8ba2A2bcE6bD799d8A2b797D6299a3D8819
NEXT_PUBLIC_ERC1155_ADDRESS=0x38689CC4389104C52F15e36A1B08A328b324223F
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x5190Ca5568000C5468970e89130e886809b98bec

### 3. Run dev server
npm run dev

Aplikacja będzie dostępna pod adresem: http://localhost:3000

---

## 🔗 Related project
Contracts (Hardhat + Solidity): https://github.com/joulix/contracts

---

## 📝 License
This project is licensed under the Business Source License 1.1 (LICENSE).
