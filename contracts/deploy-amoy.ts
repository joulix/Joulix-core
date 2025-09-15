import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Deployer: ${deployer.address} (chainId=${net.chainId})`);

  // sensowne opłaty (bump), żeby uniknąć "could not replace existing tx"
  const fee = await ethers.provider.getFeeData();
  const g = (x?: bigint, def = 30n * 10n ** 9n) => (x ?? def) * 2n;
  const overrides = {
    maxFeePerGas: g(fee.maxFeePerGas),
    maxPriorityFeePerGas: g(fee.maxPriorityFeePerGas),
  };

  // --- 1) USDCmock ---
  const USDC = await ethers.getContractFactory("USDCmock");
  const usdc = await USDC.deploy({ ...overrides });
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("USDCmock:", usdcAddr);

  // --- 2) CarbonLedgerGoO ---
  const admin  = (process.env.ADMIN   as `0x${string}`)  ?? deployer.address;
  const issuer = (process.env.ISSUER  as `0x${string}`)  ?? deployer.address;

  const GoO = await ethers.getContractFactory("CarbonLedgerGoO");
  const goo = await GoO.deploy("https://joulix.io/meta/{id}.json", admin, issuer, { ...overrides });
  await goo.waitForDeployment();
  const gooAddr = await goo.getAddress();
  console.log("CarbonLedgerGoO:", gooAddr);

  // --- 3) MarketplaceUSDC ---
  const treasury = (process.env.TREASURY as `0x${string}`) ?? deployer.address;
  const feeBps   = process.env.FEE_BPS ? Number(process.env.FEE_BPS) : 200;

  const Mkt = await ethers.getContractFactory("MarketplaceUSDC");
  const mkt = await Mkt.deploy(usdcAddr, admin, treasury, feeBps, { ...overrides });
  await mkt.waitForDeployment();
  const mktAddr = await mkt.getAddress();
  console.log("MarketplaceUSDC:", mktAddr);

  // allow GoO kolekcję
  await (await mkt.allowCollection(gooAddr, true, { ...overrides })).wait();
  console.log("allowCollection(GoO, true) ✓");

  console.log("\nADDRESSES:");
  console.log("USDCmock           =", usdcAddr);
  console.log("CarbonLedgerGoO    =", gooAddr);
  console.log("MarketplaceUSDC    =", mktAddr);
  console.log("ADMIN              =", admin);
  console.log("TREASURY           =", treasury);
  console.log("FEE_BPS            =", feeBps);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
