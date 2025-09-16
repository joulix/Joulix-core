import { expect } from "chai";
import { ethers } from "hardhat";

describe("CarbonLedgerGoO", function () {
  async function deployFixture() {
    const [admin, issuer, user, other] = await ethers.getSigners();
    const GoO = await ethers.getContractFactory("CarbonLedgerGoO");
    const goo = await GoO.deploy("https://joulix.io/meta/{id}.json", admin.address, issuer.address);
    await goo.waitForDeployment();
    return { goo, admin, issuer, user, other };
  }

  it("mint → retire: poprawny balans po umorzeniu", async () => {
    const { goo, issuer, user } = await deployFixture();

    // issuer mintuje 10e18 jednostek tokenId=1 do usera
    await expect(goo.connect(issuer).mint(user.address, 1, ethers.parseEther("10"), "0x")).to.emit(
      goo,
      "TransferSingle"
    );

    // user umarza 2e18
    await expect(goo.connect(user).retire(1, ethers.parseEther("2"), "retire test")).to.emit(
      goo,
      "Retired"
    );

    // balans powinien wynosić 8e18
    const bal = await goo.balanceOf(user.address, 1);
    expect(bal).to.equal(ethers.parseEther("8"));
  });

  it("revoke blokuje transfery danego tokenId", async () => {
    const { goo, admin, issuer, user, other } = await deployFixture();

    await goo.connect(issuer).mint(user.address, 1, 5n, "0x");
    await expect(goo.connect(admin).setRevoked(1, true, "bad batch")).to.not.be.reverted;

    await expect(
      goo.connect(user).safeTransferFrom(user.address, other.address, 1, 1n, "0x")
    ).to.be.revertedWith("token revoked");
  });

  it("pause blokuje transfery, unpause przywraca możliwość", async () => {
    const { goo, admin, issuer, user, other } = await deployFixture();

    await goo.connect(issuer).mint(user.address, 2, 5n, "0x");
    await goo.connect(admin).pause();

    await expect(
      goo.connect(user).safeTransferFrom(user.address, other.address, 2, 1n, "0x")
    ).to.be.revertedWith("paused");

    await goo.connect(admin).unpause();

    await expect(
      goo.connect(user).safeTransferFrom(user.address, other.address, 2, 1n, "0x")
    ).to.emit(goo, "TransferSingle");
  });

  it("role: tylko ISSUER może mintować", async () => {
    const { goo, issuer, user } = await deployFixture();

    // OK: issuer mintuje
    await expect(goo.connect(issuer).mint(user.address, 3, 1n, "0x")).to.emit(
      goo,
      "TransferSingle"
    );

    // NIE OK: losowy user próbuje mintować
    await expect(goo.connect(user).mint(user.address, 3, 1n, "0x")).to.be.revertedWithCustomError(
      goo,
      "AccessControlUnauthorizedAccount"
    );
  });

  it("retireBatch umarza wiele tokenId i aktualizuje salda", async () => {
    const { goo, issuer, user } = await deployFixture();

    await goo.connect(issuer).mint(user.address, 11, 100n, "0x");
    await goo.connect(issuer).mint(user.address, 22, 200n, "0x");

    await expect(goo.connect(user).retireBatch([11, 22], [40n, 50n], "batch retire")).to.not.be
      .reverted;

    expect(await goo.balanceOf(user.address, 11)).to.equal(60n);
    expect(await goo.balanceOf(user.address, 22)).to.equal(150n);
  });
});
