import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking contracts with:", deployer.address);

  // Adresy zdeployowanych kontraktów
  const usdcAddr = "0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d";
  const gooAddr = "0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209";
  const mktAddr = "0xb9110838c02c769c194aB392B3ff173611fe675d";

  console.log("\n=== Contract Status Check ===");

  // 1. Sprawdź USDCmock
  try {
    const usdc = await ethers.getContractAt("USDCmock", usdcAddr);
    const name = await usdc.name();
    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();
    const totalSupply = await usdc.totalSupply();
    console.log("✅ USDCmock:", usdcAddr);
    console.log(`   Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  } catch (error) {
    console.log("❌ USDCmock:", usdcAddr, "- Error:", error.message);
  }

  // 2. Sprawdź CarbonLedgerGoO
  try {
    const goo = await ethers.getContractAt("CarbonLedgerGoO", gooAddr);
    const uri = await goo.uri(1);
    const hasAdminRole = await goo.hasRole(await goo.DEFAULT_ADMIN_ROLE(), deployer.address);
    const hasIssuerRole = await goo.hasRole(await goo.ROLE_ISSUER(), deployer.address);
    console.log("✅ CarbonLedgerGoO:", gooAddr);
    console.log(`   URI: ${uri}`);
    console.log(`   Admin Role: ${hasAdminRole}, Issuer Role: ${hasIssuerRole}`);
  } catch (error) {
    console.log("❌ CarbonLedgerGoO:", gooAddr, "- Error:", error.message);
  }

  // 3. Sprawdź MarketplaceUSDC
  try {
    const mkt = await ethers.getContractAt("MarketplaceUSDC", mktAddr);
    const usdcToken = await mkt.quote();
    const hasAdminRole = await mkt.hasRole(await mkt.ROLE_ADMIN(), deployer.address);
    const treasury = await mkt.treasury();
    const feeBps = await mkt.feeBps();
    const isGoOAllowed = await mkt.allowedCollection(gooAddr);
    console.log("✅ MarketplaceUSDC:", mktAddr);
    console.log(`   USDC Token: ${usdcToken}`);
    console.log(`   Has Admin Role: ${hasAdminRole}, Treasury: ${treasury}`);
    console.log(`   Fee: ${feeBps} bps (${Number(feeBps)/100}%)`);
    console.log(`   GoO Collection Allowed: ${isGoOAllowed}`);
  } catch (error) {
    console.log("❌ MarketplaceUSDC:", mktAddr, "- Error:", error.message);
  }

  console.log("\n=== Polygonscan Links ===");
  console.log(`USDCmock: https://amoy.polygonscan.com/address/${usdcAddr}`);
  console.log(`CarbonLedgerGoO: https://amoy.polygonscan.com/address/${gooAddr}`);
  console.log(`MarketplaceUSDC: https://amoy.polygonscan.com/address/${mktAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
