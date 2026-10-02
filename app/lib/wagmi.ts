"use client";

import { http, createConfig, fallback } from "wagmi";
import { base } from "viem/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

// Multiple public Base mainnet RPC endpoints with fallback.
// mainnet.base.org is rate-limited; these alternatives have higher limits.
export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: fallback([
      http("https://mainnet.base.org"),             // Base official — works everywhere
      http("https://base-rpc.publicnode.com"),      // PublicNode fallback
      http("https://base.api.onfinality.io/public"), // OnFinality fallback
      http("https://base.llamarpc.com"),            // LlamaRPC — may block localhost CORS
    ]),
  },
  connectors: [farcasterMiniApp()],
  ssr: true,
});


