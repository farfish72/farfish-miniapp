"use client";

import { ThirdwebProvider as ThirdwebReactProvider } from "@thirdweb-dev/react";
import { PropsWithChildren } from "react";
import { THIRDWEB_CLIENT_ID } from "../constants";

const ThirdwebProvider = ({ children }: PropsWithChildren) => {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? THIRDWEB_CLIENT_ID;


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

