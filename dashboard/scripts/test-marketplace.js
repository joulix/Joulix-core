const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Marketplace Test...\n");

  // Adresy kontraktów
  const Market_ADDR = "0xb9110838c02c769c194aB392B3ff173611fe675d";
  const GoO_ADDR = "0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209";
  const USDC_ADDR = "0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d";

  // Pobierz signers
  const [deployer, buyer] = await ethers.getSigners();
  console.log("📋 Signers:");
  console.log("  Deployer:", deployer.address);
  console.log("  Buyer:", buyer.address);

  // Połącz z kontraktami
  console.log("\n🔗 Connecting to contracts...");
  const MarketAdmin = await ethers.getContractAt("MarketplaceUSDC", Market_ADDR, deployer);
  const MarketBuyer = await ethers.getContractAt("MarketplaceUSDC", Market_ADDR, buyer);
  const GoO_deployer = await ethers.getContractAt("CarbonLedgerGoO", GoO_ADDR, deployer);
  const GoO_buyer = await ethers.getContractAt("CarbonLedgerGoO", GoO_ADDR, buyer);
  const USDC_deployer = await ethers.getContractAt("USDCmock", USDC_ADDR, deployer);
  const USDC_buyer = await ethers.getContractAt("USDCmock", USDC_ADDR, buyer);

  console.log("✅ Contracts connected successfully");

  // Sprawdź salda początkowe
  console.log("\n💰 Initial balances:");
  const buyerUSDCInitial = await USDC_buyer.balanceOf(buyer.address);
  const buyerGoOInitial = await GoO_buyer.balanceOf(buyer.address, 1n);
  const deployerUSDCInitial = await USDC_deployer.balanceOf(deployer.address);
  const deployerGoOInitial = await GoO_deployer.balanceOf(deployer.address, 1n);
  
  console.log("  Buyer USDC:", ethers.formatUnits(buyerUSDCInitial, 6));
  console.log("  Buyer GoO (id=1):", buyerGoOInitial.toString());
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUSDCInitial, 6));
  console.log("  Deployer GoO (id=1):", deployerGoOInitial.toString());

  // 1) Mint GoO dla deployera
  console.log("\n🎯 Minting GoO for deployer...");
  const mintTx = await GoO_deployer.mint(deployer.address, 1n, ethers.parseUnits("5", 0), "0x");
  await mintTx.wait();
  console.log("  ✅ GoO minted for deployer");

  // Sprawdź saldo po mint
  const deployerGoOAfterMint = await GoO_deployer.balanceOf(deployer.address, 1n);
  console.log("  Deployer GoO after mint:", deployerGoOAfterMint.toString());

  // 2) Ustal poprawną cenę i daj approve
  console.log("\n💵 Setting up correct pricing...");
  const dec = Number(await USDC_deployer.decimals());
  const pricePerUnit = ethers.parseUnits("10", dec + 18); // 10 USDC w formacie WAD6
  console.log("  USDC decimals:", dec);
  console.log("  Price per unit (WAD6):", pricePerUnit.toString());

  // Zezwolenie marketplace na transfer GoO
  console.log("  Setting approval for GoO...");
  const approveTx = await GoO_deployer.setApprovalForAll(Market_ADDR, true);
  await approveTx.wait();
  console.log("  ✅ GoO approval set");

  // 3) Wystaw nowy listing
  console.log("\n📝 Creating new listing...");
  const NEW_ID = await MarketAdmin.nextId();
  console.log("  New listing ID:", NEW_ID.toString());
  
  const listTx = await MarketAdmin.list(GoO_ADDR, 1n, 5n, pricePerUnit);
  await listTx.wait();
  console.log("  ✅ New listing created");
  
  const remaining = await MarketAdmin.remaining(NEW_ID);
  console.log("  Remaining in listing:", remaining.toString());

  // 4) Buyer: approve USDC i zakup
  console.log("\n🛒 Buyer purchasing...");
  
  // Approve USDC
  console.log("  Approving USDC...");
  const usdcApproveTx = await USDC_buyer.approve(Market_ADDR, ethers.parseUnits("1000", 6));
  await usdcApproveTx.wait();
  console.log("  ✅ USDC approved");

  // Zakup 2 sztuk
  console.log("  Buying 2 items...");
  const buyTx = await MarketBuyer.buy(NEW_ID, 2n);
  await buyTx.wait();
  console.log("  ✅ Purchase completed");

  // Sprawdź pozostałą ilość
  const remainingAfter = await MarketAdmin.remaining(NEW_ID);
  console.log("  Remaining after purchase:", remainingAfter.toString());

  // 5) Kontrola sald
  console.log("\n📊 Final balances:");
  
  // USDC
  const buyerUSDCFinal = await USDC_buyer.balanceOf(buyer.address);
  const deployerUSDCFinal = await USDC_deployer.balanceOf(deployer.address);
  const treasury = await MarketAdmin.treasury();
  const treasuryUSDC = await USDC_deployer.balanceOf(treasury);
  
  console.log("  Buyer USDC:", ethers.formatUnits(buyerUSDCFinal, 6));
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUSDCFinal, 6));
  console.log("  Treasury USDC:", ethers.formatUnits(treasuryUSDC, 6));
  
  // GoO
  const buyerGoOFinal = await GoO_buyer.balanceOf(buyer.address, 1n);
  const deployerGoOFinal = await GoO_deployer.balanceOf(deployer.address, 1n);
  
  console.log("  Buyer GoO (id=1):", buyerGoOFinal.toString());
  console.log("  Deployer GoO (id=1):", deployerGoOFinal.toString());

  // Podsumowanie
  console.log("\n🎯 Summary:");
  const usdcSpent = buyerUSDCInitial - buyerUSDCFinal;
  const usdcReceived = deployerUSDCFinal - deployerUSDCInitial;
  const gooReceived = buyerGoOFinal - buyerGoOInitial;
  
  console.log(`  USDC spent by buyer: ${ethers.formatUnits(usdcSpent, 6)}`);
  console.log(`  USDC received by seller: ${ethers.formatUnits(usdcReceived, 6)}`);
  console.log(`  GoO received by buyer: ${gooReceived.toString()}`);
  console.log(`  Treasury fee: ${ethers.formatUnits(treasuryUSDC, 6)}`);
  
  console.log("\n✅ Marketplace test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

