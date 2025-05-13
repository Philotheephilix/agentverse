"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { hederaTestnet } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "viem";

const config = getDefaultConfig({
  appName: "Agentverse",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: [hederaTestnet],
  ssr: true, // If your dApp uses server side rendering (SSR)
  transports: {
    [hederaTestnet.id]: http(),
  },
});

export default function Provider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}