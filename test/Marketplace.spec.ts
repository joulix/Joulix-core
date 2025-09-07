import { expect } from "chai";
import { ethers } from "hardhat";

const U = {
  usdc: (n: number) => BigInt(n) * 10n ** 6n, // 6 miejsc po przecinku
  wei18: (n: number | string) => ethers.parseEther(n.toString()),
};

describe("MarketplaceUSDC", () => {
  async function deployAll() {
    const [admin, seller, buyer, treasury, other] = await ethers.getSigners();

    // 1) USDC mock i zasilenie kupującego
    const USDC = await ethers.getContractFactory("USDCmock");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();
    await usdc.mint(buyer.address, U.usdc(1_000_000)); // 1M USDCm

    // 2) GoO (ERC-1155) i mint dla sprzedawcy
    const GoO = await ethers.getContractFactory("CarbonLedgerGoO");
    // admin = ADMIN + PAUSER + ISSUER (drugi arg: initialIssuer = admin)
    const goo = await GoO.deploy("https://joulix.io/meta/{id}.json", admin.address, admin.address);
    await goo.waitForDeployment();
    const id = 1;
    await goo.mint(seller.address, id, U.wei18(2), "0x"); // 2e18

    // 3) Marketplace (1% fee)
    const Mkt = await ethers.getContractFactory("MarketplaceUSDC");
    const mkt = await Mkt.deploy(await usdc.getAddress(), admin.address, treasury.address, 100);
    await mkt.waitForDeployment();

    // allow GoO collection
    await mkt.connect(admin).allowCollection(await goo.getAddress(), true);

    return { admin, seller, buyer, treasury, other, usdc, goo, mkt, id };
  }

  it("list → partial buy → fee rozdzielone → cancel reszty", async () => {
    const { seller, buyer, treasury, usdc, goo, mkt, id } = await deployAll();

    await goo.connect(seller).setApprovalForAll(await mkt.getAddress(), true);
    await usdc.connect(buyer).approve(await mkt.getAddress(), U.usdc(1_000_000));

    // Seller listuje 2e18 @ 100 USDC / 1e18
    const pricePerUnit = U.usdc(100);
    const amount = U.wei18(2);
    const tx = await mkt.connect(seller).list(await goo.getAddress(), id, amount, pricePerUnit);
    const rc = await tx.wait();
    const ev = rc!.logs.find((l: any) => l.fragment?.name === "Listed");
    const listingId = ev?.args?.listingId ?? 1n;

    // Buyer kupuje 1e18 => koszt 100 USDC, fee 1% = 1 USDC
    const cost = U.usdc(100);
    const fee = U.usdc(1);
    const net = cost - fee;

    const buyerBefore = await usdc.balanceOf(buyer.address);
    const sellerBefore = await usdc.balanceOf(seller.address);
    const treasBefore = await usdc.balanceOf(treasury.address);

    await expect(mkt.connect(buyer).buy(listingId, U.wei18(1))).to.emit(mkt, "Purchased");

    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore - cost);
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + net);
    expect(await usdc.balanceOf(treasury.address)).to.equal(treasBefore + fee);

    // Buyer otrzymał 1e18 GoO, marketplace trzyma 1e18
    expect(await goo.balanceOf(buyer.address, id)).to.equal(U.wei18(1));

    // Cancel zwraca pozostałe 1e18 do sprzedawcy
    await expect(mkt.connect(seller).cancel(listingId)).to.emit(mkt, "Canceled");
    expect(await goo.balanceOf(seller.address, id)).to.equal(U.wei18(1));
  });

  it("pause blokuje list/buy/cancel, unpause przywraca", async () => {
    const { admin, seller, buyer, usdc, goo, mkt, id } = await deployAll();

    await mkt.connect(admin).pause();

    await goo.connect(seller).setApprovalForAll(await mkt.getAddress(), true);
    await usdc.connect(buyer).approve(await mkt.getAddress(), U.usdc(1000));

    // OZ Pausable v5 zwraca custom error EnforcedPause
    await expect(
      mkt.connect(seller).list(await goo.getAddress(), id, U.wei18(1), U.usdc(50))
    ).to.be.revertedWithCustomError(mkt, "EnforcedPause");

    await mkt.connect(admin).unpause();
    const tx = await mkt.connect(seller).list(await goo.getAddress(), id, U.wei18(1), U.usdc(50));
    const rc = await tx.wait();
    const ev = rc!.logs.find((l: any) => l.fragment?.name === "Listed");
    const listingId = ev?.args?.listingId ?? 1n;

    await expect(mkt.connect(buyer).buy(listingId, U.wei18(1))).to.emit(mkt, "Purchased");
  });

  it("tylko sprzedawca może anulować listing (custom error NotSeller)", async () => {
    const { seller, buyer, goo, mkt, id } = await deployAll();
    await goo.connect(seller).setApprovalForAll(await mkt.getAddress(), true);
    const tx = await mkt.connect(seller).list(await goo.getAddress(), id, U.wei18(1), U.usdc(10));
    const rc = await tx.wait();
    const ev = rc!.logs.find((l: any) => l.fragment?.name === "Listed");
    const listingId = ev?.args?.listingId ?? 1n;

    await expect(mkt.connect(buyer).cancel(listingId)).to.be.revertedWithCustomError(mkt, "NotSeller");
    await expect(mkt.connect(seller).cancel(listingId)).to.emit(mkt, "Canceled");
  });

  it("odrzuca zakupy ponad pozostałą ilość (custom error InsufficientRemaining)", async () => {
    const { seller, buyer, usdc, goo, mkt, id } = await deployAll();
    await goo.connect(seller).setApprovalForAll(await mkt.getAddress(), true);
    await usdc.connect(buyer).approve(await mkt.getAddress(), U.usdc(1_000_000));

    const pricePerUnit = U.usdc(100);
    const amount = U.wei18(1);
    const tx = await mkt.connect(seller).list(await goo.getAddress(), id, amount, pricePerUnit);
    const rc = await tx.wait();
    const ev = rc!.logs.find((l: any) => l.fragment?.name === "Listed");
    const listingId = ev?.args?.listingId ?? 1n;

    await expect(
      mkt.connect(buyer).buy(listingId, U.wei18(2)) // żądamy więcej niż wystawiono
    ).to.be.revertedWithCustomError(mkt, "InsufficientRemaining");
  });

  it("odrzuca listowanie dla niedozwolonej kolekcji (custom error CollectionNotAllowed)", async () => {
    const { seller, mkt } = await deployAll();

    // Wymyślony adres kolekcji, której nie dopuściliśmy
    const fake1155 = "0x0000000000000000000000000000000000000001";
    await expect(
      mkt.connect(seller).list(fake1155, 1, U.wei18(1), U.usdc(10))
    ).to.be.revertedWithCustomError(mkt, "CollectionNotAllowed");
  });

  it("fee i treasury: walidacje w setFee (FeeTooHigh / TreasuryZero)", async () => {
    const { admin, mkt, treasury } = await deployAll();

    // Za wysokie fee (>20%)
    await expect(
      mkt.connect(admin).setFee(2_001, treasury.address)
    ).to.be.revertedWithCustomError(mkt, "FeeTooHigh");

    // Puste treasury
    await expect(
      mkt.connect(admin).setFee(100, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(mkt, "TreasuryZero");

    // Poprawne ustawienie
    await expect(mkt.connect(admin).setFee(250, treasury.address)).to.emit(mkt, "FeeUpdated");
  });

  it("rescueERC20: tylko admin, poprawnie odzyskuje środki", async () => {
    const { admin, buyer, usdc, mkt } = await deployAll();

    // Wpłaćmy omyłkowo 100 USDCm na adres marketplace
    await usdc.connect(buyer).transfer(await mkt.getAddress(), U.usdc(100));

    // Nie-admin nie może
    await expect(
      mkt.connect(buyer).rescueERC20(await usdc.getAddress(), buyer.address, U.usdc(100))
    ).to.be.revertedWithCustomError(mkt, "AccessControlUnauthorizedAccount");

    // Admin może
    const before = await usdc.balanceOf(buyer.address);
    await mkt.connect(admin).rescueERC20(await usdc.getAddress(), buyer.address, U.usdc(100));
    expect(await usdc.balanceOf(buyer.address)).to.equal(before + U.usdc(100));
  });

  it("rescueERC1155: tylko admin, poprawnie zwraca tokeny", async () => {
    const { admin, other, goo, mkt } = await deployAll();

    // Mint bezpośrednio na marketplace (nie przez listing)
    const id2 = 222;
    await goo.mint(await mkt.getAddress(), id2, U.wei18(3), "0x");

    // Nie-admin nie może
    await expect(
      mkt.connect(other).rescueERC1155(await goo.getAddress(), other.address, id2, U.wei18(1), "0x")
    ).to.be.revertedWithCustomError(mkt, "AccessControlUnauthorizedAccount");

    // Admin może
    const before = await goo.balanceOf(other.address, id2);
    await mkt.connect(admin).rescueERC1155(await goo.getAddress(), other.address, id2, U.wei18(2), "0x");
    expect(await goo.balanceOf(other.address, id2)).to.equal(before + U.wei18(2));
  });
});
