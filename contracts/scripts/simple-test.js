const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Simple Marketplace Test...\n");

  const Market_ADDR = "0xb9110838c02c769c194aB392B3ff173611fe675d";
  const GoO_ADDR = "0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209";
  const USDC_ADDR = "0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d";

  const [deployer, buyer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Buyer:", buyer.address);

  // Połącz z kontraktami
  const GoO_deployer = await ethers.getContractAt("CarbonLedgerGoO", GoO_ADDR, deployer);
  const USDC_deployer = await ethers.getContractAt("USDCmock", USDC_ADDR, deployer);
  const MarketAdmin = await ethers.getContractAt("MarketplaceUSDC", Market_ADDR, deployer);

  // Sprawdź salda
  const deployerGoO = await GoO_deployer.balanceOf(deployer.address, 1n);
  console.log("Deployer GoO (id=1):", deployerGoO.toString());

  // Mint GoO jeśli nie ma
  if (deployerGoO == 0n) {
    console.log("Minting GoO...");
    const mintTx = await GoO_deployer.mint(deployer.address, 1n, ethers.parseUnits("5", 0), "0x");
    await mintTx.wait();
    console.log("✅ GoO minted");
  }

  // Sprawdź saldo po mint
  const deployerGoOAfter = await GoO_deployer.balanceOf(deployer.address, 1n);
  console.log("Deployer GoO after mint:", deployerGoOAfter.toString());

  // Approve marketplace
  console.log("Setting approval...");
  const approveTx = await GoO_deployer.setApprovalForAll(Market_ADDR, true);
  await approveTx.wait();
  console.log("✅ Approval set");

  // Ustal cenę
  const dec = Number(await USDC_deployer.decimals());
  const pricePerUnit = ethers.parseUnits("10", dec + 18);
  console.log("Price per unit:", pricePerUnit.toString());

  // Wystaw listing
  console.log("Creating listing...");
  const NEW_ID = await MarketAdmin.nextId();
  console.log("New listing ID:", NEW_ID.toString());
  
  const listTx = await MarketAdmin.list(GoO_ADDR, 1n, 5n, pricePerUnit);
  await listTx.wait();
  console.log("✅ Listing created");

  console.log("✅ Test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
