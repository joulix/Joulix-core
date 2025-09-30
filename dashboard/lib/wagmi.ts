"use client";

import { createConfig, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
// UŻYWAMY TYLKO LEKKIEGO CONNECTORA:
import { injected } from "wagmi/connectors";
import { RPC_URL } from "@/lib/addresses";

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: [injected()], // żadnych @wagmi/connectors/metaMask ani walletconnect
  transports: { [polygonAmoy.id]: http(RPC_URL) },
  ssr: true,
});
