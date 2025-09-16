import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy USDC mock (do demo)
  const USDC = await ethers.getContractFactory("USDCmock");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  console.log("USDCmock:", await usdc.getAddress());

  // 2) Deploy GoO (ERC-1155)
  // Base URI możesz podmienić później na IPFS/HTTP (np. https://api.joulix.io/meta/{id}.json)
  const baseURI = "https://joulix.io/meta/{id}.json";
  const GoO = await ethers.getContractFactory("CarbonLedgerGoO");
  const goo = await GoO.deploy(baseURI, deployer.address, deployer.address);
  await goo.waitForDeployment();
  console.log("CarbonLedgerGoO:", await goo.getAddress());

  // 3) Demo: mint 10 jednostek tokenId=1 i umorzenie 2
  const tokenId = 1n;
  await (await goo.mint(deployer.address, tokenId, 10n * 10n ** 18n, "0x")).wait();
  console.log("Minted tokenId=1 amount=10e18 to deployer");

  await (await goo.retire(tokenId, 2n * 10n ** 18n, "demo retire")).wait();
  console.log("Retired 2e18 of tokenId=1");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
