"use client";
import { useEffect, useState } from "react";

const allowedHosts = [
  "warpcast.com", 
  "supercast.xyz", 
  "farcaster.xyz",
  "farcaster",
  "client.farcaster"
];

export default function useFarcasterGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      // Check multiple Farcaster indicators
      const isInFrame = typeof window !== "undefined" && window.parent !== window;
      const hasFarcasterUA = typeof navigator !== "undefined" && 
        /Farcaster|Warpcast/i.test(navigator.userAgent || "");
      const hasFarcasterReferrer = typeof document !== "undefined" && 
        allowedHosts.some(host => document.referrer?.includes(host));
      const hasFarcasterWallet = typeof window !== "undefined" && 
        ((window as any)?.ethereum?.isFarcaster || (window as any)?.farcasterWallet);

      // Allow if any Farcaster indicator is present
      const isFarcasterEnv = isInFrame || hasFarcasterUA || hasFarcasterReferrer || hasFarcasterWallet;
      
      setBlocked(!isFarcasterEnv);
    } catch {
      setBlocked(true);
    }
  }, []);

  const message =
    "ACCESS DENIED. Please open FarFISH through a Farcaster client (Warpcast/Supercast) to connect your wallet.";

  return { blocked, message };
}