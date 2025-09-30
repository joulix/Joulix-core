"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polygonAmoy } from "wagmi/chains";
import { injected } from "@wagmi/connectors";
import { ADDR } from "@/lib/addresses";

const config = createConfig({
  chains: [{ ...polygonAmoy, rpcUrls: { default: { http: [ADDR.RPC] } } }],
  transports: { [polygonAmoy.id]: http(ADDR.RPC) },
  connectors: [injected()], // <<— kluczowe: konektor przeniesiony do @wagmi/connectors
});

const qc = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
