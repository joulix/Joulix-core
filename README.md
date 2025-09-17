# Joulix

Carbon credit marketplace platform with smart contracts and web dashboard.

## 📁 Project Structure

```
Joulix/
├── contracts/          # Smart contracts (Hardhat + Solidity)
│   ├── contracts/      # Solidity contracts
│   ├── scripts/        # Deployment and testing scripts
│   └── test/          # Contract tests
└── dashboard/         # Web dashboard (Next.js + React)
    ├── app/           # Next.js app directory
    ├── components/    # React components
    └── lib/           # Utilities and configurations
```

## 🚀 Quick Start

### Smart Contracts
```bash
cd contracts
npm install
cp .env.example .env
# Configure .env with your keys
npx hardhat run scripts/simple-test.js --network amoy
```

### Web Dashboard
```bash
cd dashboard
npm install
cp .env.local.example .env.local
# Configure .env.local with contract addresses
npm run dev
```

## 📋 Deployed Contracts (Polygon Amoy)

- **USDCmock**: `0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d`
- **CarbonLedgerGoO**: `0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209`
- **MarketplaceUSDC**: `0xb9110838c02c769c194aB392B3ff173611fe675d`

## 🧪 Testing

The marketplace has been fully tested and verified working:

- ✅ GoO token minting
- ✅ Marketplace listing creation
- ✅ USDC payment processing
- ✅ Token transfers
- ✅ Fee distribution

## 📝 License

This project is licensed under the Business Source License 1.1.