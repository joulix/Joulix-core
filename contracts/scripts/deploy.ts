import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Opcjonalnie: sterowanie opłatami EIP-1559 przez ENV lub domyślne wartości
  const priorityGwei = process.env.MAX_PRIORITY_GWEI || "30"; // maxPriorityFeePerGas
  const maxFeeGwei = process.env.MAX_FEE_GWEI || "80";        // maxFeePerGas
  const confirmations = Number(process.env.CONFIRMATIONS || "1");
  const minimal = process.env.MIN_DEPLOY === "true";
  const txOpts = {
    maxPriorityFeePerGas: ethers.parseUnits(priorityGwei, "gwei"),
    maxFeePerGas: ethers.parseUnits(maxFeeGwei, "gwei"),
  } as const;

  // 1. Deploy USDCmock
  const USDCmock = await ethers.getContractFactory("USDCmock");
  const GoO = await ethers.getContractFactory("CarbonLedgerGoO");
  // Równoległy deploy USDC i GoO
  const [usdc, goo] = await Promise.all([
    USDCmock.deploy(txOpts),
    GoO.deploy(
      "https://joulix.io/meta/{id}.json",
      deployer.address,
      deployer.address,
      txOpts
    ),
  ]);
  await Promise.all([usdc.waitForDeployment(), goo.waitForDeployment()]);
  console.log("USDCmock deployed to:", await usdc.getAddress());
  console.log("CarbonLedgerGoO deployed to:", await goo.getAddress());

  // 2. Deploy CarbonLedgerGoO
  // goo już zdeployowany powyżej

  // 3. Deploy MarketplaceUSDC
  const Marketplace = await ethers.getContractFactory("MarketplaceUSDC");
  const marketplace = await Marketplace.deploy(
    await usdc.getAddress(),            // adres USDCmock
    deployer.address,                   // admin
    deployer.address,                   // treasury = deployer (możesz zmienić na inny adres)
    200,                                // fee = 2% (200 = 2% w bazowych punktach)
    txOpts
  );
  await marketplace.waitForDeployment();
  console.log("MarketplaceUSDC deployed to:", await marketplace.getAddress());

  // 4. Configure marketplace - allow GoO collection
  const tx1 = await marketplace.allowCollection(await goo.getAddress(), true, txOpts);
  await tx1.wait(confirmations);
  console.log("GoO collection allowed in marketplace");

  if (!minimal) {
    // 5. Demo: mint some GoO tokens
    const tokenId = 1n;
    const mintTx = await goo.mint(deployer.address, tokenId, 10n * 10n ** 18n, "0x", txOpts);
    const retireTx = await goo.retire(tokenId, 2n * 10n ** 18n, "demo retire", txOpts);
    await Promise.all([mintTx.wait(confirmations), retireTx.wait(confirmations)]);
    console.log("Minted 10e18 GoO tokens (tokenId=1) to deployer");
    console.log("Retired 2e18 GoO tokens");
  } else {
    console.log("Minimal deploy: pominięto mint/retire");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("USDCmock:", await usdc.getAddress());
  console.log("CarbonLedgerGoO:", await goo.getAddress());
  console.log("MarketplaceUSDC:", await marketplace.getAddress());
  console.log("Deployer:", deployer.address);
}

// Hardhat entrypoint
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
