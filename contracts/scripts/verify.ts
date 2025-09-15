import { run } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

function isAddress(x?: string): x is string {
  return !!x && /^0x[0-9a-fA-F]{40}$/.test(x);
}

async function verify(label: string, address: string, args: any[]) {
  console.log(`\n➡️  Verifying ${label}`);
  console.log(`   address: ${address}`);
  if (args.length) console.log(`   args: ${JSON.stringify(args)}`);
  try {
    await run("verify:verify", { address, constructorArguments: args });
    console.log(`✅ ${label} verified: https://amoy.polygonscan.com/address/${address}#code`);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/Already Verified/i.test(msg)) {
      console.log(`ℹ️ ${label} already verified.`);
    } else {
      console.log(`❌ ${label} verification failed:\n${msg}`);
    }
  }
}

async function main() {
  // 1) Wczytaj adresy z .env
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const GOO_ADDRESS = process.env.GOO_ADDRESS;
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS;
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;
  const BASE_URI = process.env.BASE_URI || "https://joulix.io/meta/{id}.json";

  // 2) Walidacja
  const missing: string[] = [];
  if (!isAddress(USDC_ADDRESS)) missing.push("USDC_ADDRESS");
  if (!isAddress(GOO_ADDRESS)) missing.push("GOO_ADDRESS");
  if (!isAddress(MARKETPLACE_ADDRESS)) missing.push("MARKETPLACE_ADDRESS");
  if (!isAddress(ADMIN_ADDRESS)) missing.push("ADMIN_ADDRESS");

  if (missing.length) {
    console.error(
      `❌ Brak/niepoprawne zmienne w .env: ${missing.join(
        ", "
      )}\nUpewnij się, że każda ma format 0x… (40 hex).`
    );
    process.exit(1);
  }

  // 3) Pokaż podsumowanie zanim zaczniemy
  console.log("=== Contract Verification (Amoy) ===");
  console.log("USDC_ADDRESS        :", USDC_ADDRESS);
  console.log("GOO_ADDRESS         :", GOO_ADDRESS);
  console.log("MARKETPLACE_ADDRESS :", MARKETPLACE_ADDRESS);
  console.log("ADMIN_ADDRESS       :", ADMIN_ADDRESS);
  console.log("BASE_URI            :", BASE_URI);

  // 4) Verify (kolejność argumentów jak w constructorach)
  // USDCmock: brak argumentów
  await verify("USDCmock", USDC_ADDRESS!, []);

  // CarbonLedgerGoO: (baseURI, admin, issuer)  — u nas admin = issuer
  await verify("CarbonLedgerGoO", GOO_ADDRESS!, [BASE_URI, ADMIN_ADDRESS, ADMIN_ADDRESS]);

  // MarketplaceUSDC: (usdc, goo, feeBps, admin) — fee=200 (2%)
  await verify("MarketplaceUSDC", MARKETPLACE_ADDRESS!, [USDC_ADDRESS, GOO_ADDRESS, 200, ADMIN_ADDRESS]);

  console.log("\n🎉 Zakończono weryfikację.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
