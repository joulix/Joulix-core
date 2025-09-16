import { ethers } from "hardhat";

async function main() {
  const [buyer] = await ethers.getSigners();
  const MKT = process.env.MKT_ADDRESS!;
  const listingId = BigInt(process.env.LISTING_ID ?? "1");
  const amount = BigInt(process.env.BUY_AMOUNT ?? ethers.parseEther("1").toString()); // 1e18

  const mkt = await ethers.getContractAt("MarketplaceUSDC", MKT, buyer);
  const quote = await (async () => {
    const addr = await mkt.quote();
    return await ethers.getContractAt("USDCmock", addr, buyer);
  })();

  // approve USDC to marketplace
  await (await quote.approve(MKT, 1_000_000_000n * 10n ** 6n)).wait(); // duży limit

  const tx = await mkt.buy(listingId, amount);
  const rc = await tx.wait();
  console.log("Bought. Tx:", tx.hash);
  console.log(
    "Events:",
    rc?.logs?.map((l: any) => l.fragment?.name)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
