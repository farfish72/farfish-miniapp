"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import useUser from "../hooks/useUser";

type FarcasterSignerContextType = {
  address: `0x${string}` | undefined;
  fid: number | null;
  signer: ethers.Signer | null;
  provider: ethers.providers.Web3Provider | null;
  isConnected: boolean;
  isLoading: boolean;
};

const FarcasterSignerContext = createContext<FarcasterSignerContextType>({
  address: undefined,
  fid: null,
  signer: null,
  provider: null,
  isConnected: false,
  isLoading: true,
});

export const useFarcasterSigner = () => useContext(FarcasterSignerContext);

export function FarcasterSignerProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { user } = useUser();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const initSigner = async () => {
      setIsLoading(true);
      try {
        if (!isConnected || !address) {
          setSigner(null);
          setProvider(null);
          setIsLoading(false);
          return;
        }

        // Get provider from Farcaster window.ethereum
        const win = window as any;
        let ethereumProvider = null;

        // Try Farcaster's ethereum provider first
        if (win?.farcaster?.ethereum) {
          ethereumProvider = win.farcaster.ethereum;
        } else if (win?.ethereum?.isFarcaster) {
          ethereumProvider = win.ethereum;
        } else if (win?.sdk?.provider) {
          // Fallback to SDK provider
          ethereumProvider = win.sdk.provider;
        } else if (win?.ethereum) {
          // Last resort: use window.ethereum if available (should be Farcaster in Farcaster env)
          ethereumProvider = win.ethereum;
        }

        if (ethereumProvider) {
          // Create ethers Web3Provider from the provider (ethers v5)
          const ethersProvider = new ethers.providers.Web3Provider(ethereumProvider);
          const ethersSigner = ethersProvider.getSigner(address);
          setProvider(ethersProvider);
          setSigner(ethersSigner);
        } else {
          console.warn("No Farcaster ethereum provider found");
          setSigner(null);
          setProvider(null);
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster signer", error);
        setSigner(null);
        setProvider(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSigner();
  }, [address, isConnected]);

  const fid = user?.fid ?? null;

  return (
    <FarcasterSignerContext.Provider
      value={{
        address,
        fid,
        signer,
        provider,
        isConnected: isConnected && !!signer,
        isLoading,
      }}
    >
      {children}
    </FarcasterSignerContext.Provider>
  );
}

