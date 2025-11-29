"use client";

import { useEffect, useState } from "react";
import { detectFarcasterEnvironment } from "../utils/farcaster";

export default function useFarcasterGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(!detectFarcasterEnvironment());
  }, []);

  const message =
    "ACCESS DENIED. Please open FarFISH through a Farcaster client (Warpcast/Supercast) to connect your wallet.";

  return { blocked, message };
}