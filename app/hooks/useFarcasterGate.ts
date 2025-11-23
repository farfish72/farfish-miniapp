"use client";
import { useEffect, useState } from "react";

const allowedHosts = ["warpcast.com", "supercast.xyz", "farcaster.xyz"]; 

export default function useFarcasterGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      const ref = typeof document !== "undefined" ? document.referrer : "";
      const ok = allowedHosts.some((h) => ref.includes(h));
      setBlocked(!ok);
    } catch {
      setBlocked(true);
    }
  }, []);

  const message =
    "ACCESS DENIED. Please open FarFISH through a Farcaster client (Warpcast/Supercast) to connect your wallet.";

  return { blocked, message };
}
