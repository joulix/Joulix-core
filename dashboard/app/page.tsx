"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
import { ADDR } from "@/lib/addresses";
import { ERC20_ABI, ERC1155_ABI, MARKET_ABI } from "@/lib/abi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect(); // <- bierzemy konektory z configu
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const [mounted, setMounted] = useState(false);

  const [listingId, setListingId] = useState<bigint>(1n);
  const [amount, setAmount] = useState<bigint>(1n);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allowance = useReadContract({
    abi: ERC20_ABI,
    address: ADDR.USDC as `0x${string}`,
    functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", ADDR.Market as `0x${string}`],
    query: { enabled: !!address && isConnected },
  });

  async function approveUSDC() {
    if (!address) {
      alert("❌ Please connect your wallet first");
      return;
    }
    
    const amt = parseUnits("1000", 6);
    await writeContractAsync({
      abi: ERC20_ABI,
      address: ADDR.USDC as `0x${string}`,
      functionName: "approve",
      args: [ADDR.Market as `0x${string}`, amt],
    });
    alert("✅ Approved 1000 USDC for Marketplace");
  }

  async function buy() {
    if (!address) {
      alert("❌ Please connect your wallet first");
      return;
    }
    
    await writeContractAsync({
      abi: MARKET_ABI,
      address: ADDR.Market as `0x${string}`,
      functionName: "buy",
      args: [listingId, amount],
    });
    alert(`✅ Bought ${amount} from listing #${listingId.toString()}`);
  }

  async function mintGoO() {
    if (!address) {
      alert("❌ Please connect your wallet first");
      return;
    }
    
    await writeContractAsync({
      abi: ERC1155_ABI,
      address: ADDR.GoO as `0x${string}`,
      functionName: "mint",
      args: [address as `0x${string}`, 1n, 1n, "0x"],
    });
    alert("✅ Minted GoO");
  }

  const injected = connectors.find((c) => c.id === "injected");

  if (!mounted) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>🚀 Joulix Dashboard</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>🚀 Joulix Dashboard</h1>

      {!isConnected ? (
        <>
          <button
            onClick={() => connect({ connector: injected ?? connectors[0] })}
            disabled={status === "pending"}
          >
            🔑 Connect Wallet
          </button>
          {error && <p style={{ color: "crimson" }}>{error.message}</p>}
        </>
      ) : (
        <>
          <p>Connected: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>

          <hr style={{ margin: "16px 0" }} />

          <h2>1) Approve USDC → Marketplace</h2>
          <p>Allowance: {allowance.data ? allowance.data.toString() : "—"}</p>
          <button onClick={approveUSDC}>Approve 1000 USDC</button>

          <h2 style={{ marginTop: 24 }}>2) Buy from Listing</h2>
          <label>
            Listing ID:{" "}
            <input
              value={listingId.toString()}
              onChange={(e) => setListingId(BigInt(e.target.value || "0"))}
            />
          </label>{" "}
          <label>
            Amount:{" "}
            <input
              value={amount.toString()}
              onChange={(e) => setAmount(BigInt(e.target.value || "0"))}
            />
          </label>{" "}
          <button onClick={buy}>Buy</button>

          <h2 style={{ marginTop: 24 }}>3) Mint GoO (role ISSUER required)</h2>
          <button onClick={mintGoO}>Mint 1 GoO</button>
        </>
      )}
    </main>
  );
}
