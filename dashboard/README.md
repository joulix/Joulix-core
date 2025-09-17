# Joulix Contracts

Smart contracts for Joulix carbon credit marketplace deployed on Polygon Amoy.

## 📦 Tech stack
- Hardhat – Development framework
- Solidity 0.8.20 – Smart contracts
- TypeScript – Type safety
- OpenZeppelin – Security libraries
- ethers.js – Web3 integration

---

## 🚀 Quickstart

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Skopiuj `.env.example` do `.env` i ustaw zmienne środowiskowe:

```bash
cp .env.example .env
```

Ustaw zmienne w pliku `.env`:
```
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY_DEPLOYER=0x...
PRIVATE_KEY_BUYER=0x...
ETHERSCAN_API_KEY=...
```

### 3. Deploy contracts
```bash
npx hardhat run scripts/deploy.ts --network amoy
```

### 4. Test marketplace
```bash
# Test podstawowy (mint + listing)
npx hardhat run scripts/simple-test.js --network amoy

# Test zakupu
npx hardhat run scripts/test-buy.js --network amoy
```

## 📋 Deployed Contracts (Amoy)

- **USDCmock**: `0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d`
- **CarbonLedgerGoO**: `0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209`
- **MarketplaceUSDC**: `0xb9110838c02c769c194aB392B3ff173611fe675d`

---

## 🧪 Testing Scripts

- **`simple-test.js`** - Podstawowy test (mint GoO + utworzenie listingu)
- **`test-buy.js`** - Test zakupu z weryfikacją sald
- **`test-marketplace.js`** - Pełny test marketplace (mint + list + buy)

## 🔗 Related project
Dashboard (Next.js + React): https://github.com/joulix/dashboard

---

## 📝 License
This project is licensed under the Business Source License 1.1 (LICENSE).
