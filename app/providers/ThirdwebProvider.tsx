"use client";

import { ThirdwebProvider as ThirdwebReactProvider } from "@thirdweb-dev/react";
import { PropsWithChildren } from "react";

const ThirdwebProvider = ({ children }: PropsWithChildren) => {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

  if (!clientId) {
    console.warn("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Thirdweb features will be disabled.");
  }

  return (
    <ThirdwebReactProvider
      clientId={clientId}
      activeChain="base"
      dAppMeta={{
        name: "FarFISH",
        description: "Mint. Stake. Earn. Dominate the seas.",
        logoUrl: "https://farfish.app/frame-placeholder.png",
        url: "https://farfish.app",
      }}
    >
      {children}
    </ThirdwebReactProvider>
  );
};

export default ThirdwebProvider;

