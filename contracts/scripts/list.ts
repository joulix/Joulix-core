import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const MKT = process.env.MKT_ADDRESS!;
  const GOO = process.env.GOO_ADDRESS!;
  const id = BigInt(process.env.LIST_ID ?? "1");
  const amount = BigInt(process.env.LIST_AMOUNT ?? ethers.parseEther("1").toString()); // 1e18
  const price = BigInt(process.env.LIST_PRICE ?? (100n * 10n ** 6n).toString()); // 100 USDC (6 dec)

  const goo = await ethers.getContractAt("CarbonLedgerGoO", GOO, signer);
  const mkt = await ethers.getContractAt("MarketplaceUSDC", MKT, signer);

  // approve ERC1155 to marketplace
  await (await goo.setApprovalForAll(MKT, true)).wait();

  const tx = await mkt.list(GOO, id, amount, price);
  const rc = await tx.wait();
  console.log("Listed. Tx:", tx.hash);
  console.log(
    "Events:",
    rc?.logs?.map((l: any) => l.fragment?.name)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
