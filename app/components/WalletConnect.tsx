"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectWallet } from "@thirdweb-dev/react";

export default function WalletConnect() {
  const [isFarcaster, setIsFarcaster] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uaIsFarcaster = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Farcaster|Warpcast/i.test(navigator.userAgent || "");
  }, []);

  useEffect(() => {
    try {
      const hasFarcasterEthereum = typeof window !== "undefined" && 
        (window as any)?.ethereum?.isFarcaster === true;
      
      const hasFarcasterWalletObj = typeof window !== "undefined" && 
        !!(window as any)?.farcasterWallet;
      
      const isInFrame = typeof window !== "undefined" && window.parent !== window;
      
      const hasFarcasterReferrer = typeof document !== "undefined" && 
        document.referrer?.includes('farcaster');
      
      setIsFarcaster(
        hasFarcasterEthereum || 
        hasFarcasterWalletObj || 
        uaIsFarcaster ||
        isInFrame ||
        hasFarcasterReferrer
      );
    } catch {
      setIsFarcaster(false);
    }
  }, [uaIsFarcaster]);

  async function connectFarcaster() {
    setError(null);
    try {
      setConnecting(true);
      
      // Try Farcaster Ethereum first
      const eth = (window as any)?.ethereum;
      if (eth && (eth.isFarcaster || uaIsFarcaster)) {
        const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
        setAddress(accounts?.[0] ?? null);
        setConnecting(false);
        return;
      }
      
      // Try Farcaster Wallet object
      const fc = (window as any)?.farcasterWallet;
      if (fc && typeof fc.connect === "function") {
        const acct: string = await fc.connect();
        setAddress(acct || null);
        setConnecting(false);
        return;
      }
      
      // Try window.farcaster
      const farcaster = (window as any)?.farcaster;
      if (farcaster && typeof farcaster.connect === "function") {
        const acct: string = await farcaster.connect();
        setAddress(acct || null);
        setConnecting(false);
        return;
      }
      
      throw new Error("Farcaster wallet not available");
      
    } catch (e: any) {
      setConnecting(false);
      setError(e?.message || "Failed to connect Farcaster wallet");
      console.error("Farcaster wallet connection error:", e);
    }
  }

  return (
    <div className="w-full">
      {isFarcaster && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Farcaster Wallet</p>
            <button
              type="button"
              onClick={connectFarcaster}
              disabled={connecting}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                connecting ? "bg-white/10 text-white/60" : "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black"
              }`}
            >
              {connecting ? "Connecting..." : address ? "Connected" : "Connect"}
            </button>
          </div>
          {address && (
            <p className="mt-2 text-xs text-white/70">
              Address: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <ConnectWallet />
      </div>
    </div>
  );
}