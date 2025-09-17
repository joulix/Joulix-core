const { ethers } = require("hardhat");

async function main() {
  console.log("🛒 Testing Marketplace Purchase...\n");

  const Market_ADDR = "0xb9110838c02c769c194aB392B3ff173611fe675d";
  const GoO_ADDR = "0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209";
  const USDC_ADDR = "0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d";

  const [deployer, buyer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Buyer:", buyer.address);

  // Połącz z kontraktami
  const MarketBuyer = await ethers.getContractAt("MarketplaceUSDC", Market_ADDR, buyer);
  const USDC_buyer = await ethers.getContractAt("USDCmock", USDC_ADDR, buyer);
  const GoO_buyer = await ethers.getContractAt("CarbonLedgerGoO", GoO_ADDR, buyer);
  const USDC_deployer = await ethers.getContractAt("USDCmock", USDC_ADDR, deployer);
  const GoO_deployer = await ethers.getContractAt("CarbonLedgerGoO", GoO_ADDR, deployer);
  const MarketAdmin = await ethers.getContractAt("MarketplaceUSDC", Market_ADDR, deployer);

  // Sprawdź salda przed zakupem
  console.log("\n💰 Balances before purchase:");
  const buyerUSDCBefore = await USDC_buyer.balanceOf(buyer.address);
  const buyerGoOBefore = await GoO_buyer.balanceOf(buyer.address, 1n);
  const deployerUSDCBefore = await USDC_deployer.balanceOf(deployer.address);
  const deployerGoOBefore = await GoO_deployer.balanceOf(deployer.address, 1n);
  
  console.log("  Buyer USDC:", ethers.formatUnits(buyerUSDCBefore, 6));
  console.log("  Buyer GoO (id=1):", buyerGoOBefore.toString());
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUSDCBefore, 6));
  console.log("  Deployer GoO (id=1):", deployerGoOBefore.toString());

  // Sprawdź listing
  const listingId = 3n; // z poprzedniego testu
  const remaining = await MarketAdmin.remaining(listingId);
  console.log(`\n📋 Listing ${listingId} remaining:`, remaining.toString());

  // Approve USDC
  console.log("\n💳 Approving USDC...");
  const approveTx = await USDC_buyer.approve(Market_ADDR, ethers.parseUnits("1000", 6));
  await approveTx.wait();
  console.log("✅ USDC approved");

  // Zakup 2 sztuk
  console.log("\n🛒 Buying 2 items...");
  const buyTx = await MarketBuyer.buy(listingId, 2n);
  await buyTx.wait();
  console.log("✅ Purchase completed");

  // Sprawdź salda po zakupie
  console.log("\n💰 Balances after purchase:");
  const buyerUSDCAfter = await USDC_buyer.balanceOf(buyer.address);
  const buyerGoOAfter = await GoO_buyer.balanceOf(buyer.address, 1n);
  const deployerUSDCAfter = await USDC_deployer.balanceOf(deployer.address);
  const deployerGoOAfter = await GoO_deployer.balanceOf(deployer.address, 1n);
  
  console.log("  Buyer USDC:", ethers.formatUnits(buyerUSDCAfter, 6));
  console.log("  Buyer GoO (id=1):", buyerGoOAfter.toString());
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUSDCAfter, 6));
  console.log("  Deployer GoO (id=1):", deployerGoOAfter.toString());

  // Sprawdź pozostałą ilość
  const remainingAfter = await MarketAdmin.remaining(listingId);
  console.log(`  Listing ${listingId} remaining:`, remainingAfter.toString());

  // Sprawdź treasury
  const treasury = await MarketAdmin.treasury();
  const treasuryUSDC = await USDC_deployer.balanceOf(treasury);
  console.log("  Treasury USDC:", ethers.formatUnits(treasuryUSDC, 6));

  // Podsumowanie
  console.log("\n🎯 Summary:");
  const usdcSpent = buyerUSDCBefore - buyerUSDCAfter;
  const usdcReceived = deployerUSDCAfter - deployerUSDCBefore;
  const gooReceived = buyerGoOAfter - buyerGoOBefore;
  
  console.log(`  USDC spent by buyer: ${ethers.formatUnits(usdcSpent, 6)}`);
  console.log(`  USDC received by seller: ${ethers.formatUnits(usdcReceived, 6)}`);
  console.log(`  GoO received by buyer: ${gooReceived.toString()}`);
  console.log(`  Treasury fee: ${ethers.formatUnits(treasuryUSDC, 6)}`);
  
  console.log("\n✅ Purchase test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
