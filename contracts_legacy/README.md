# Joulix Contracts

Smart contracts for tokenizing green energy certificates (GoO) and running a marketplace.

## 📦 Tech stack

- [Solidity](https://soliditylang.org/) – smart contracts
- [Hardhat](https://hardhat.org/) – development & testing
- [OpenZeppelin](https://openzeppelin.com/contracts/) – security & standards
- [TypeScript](https://www.typescriptlang.org/) – scripts & tests

## 🚀 Quickstart

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Skopiuj `.env.example` do `.env` i uzupełnij zmienne:

```bash
cp .env.example .env
```

Wymagane zmienne:

- `AMOY_RPC_URL` - URL RPC dla Polygon Amoy testnet
- `PRIVATE_KEY_DEPLOYER` - klucz prywatny do deployu (bez 0x)
- `POLYGONSCAN_API_KEY` - klucz API Etherscan (V2 - wspólny dla wszystkich sieci)

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Run tests

```bash
npx hardhat test
```

### 5. Deploy to Polygon Amoy testnet

```bash
npx hardhat run scripts/deploy.ts --network amoy
```

### 6. Verify contracts on Polygonscan

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 📝 License

This project is licensed under the [Business Source License 1.1](LICENSE).
