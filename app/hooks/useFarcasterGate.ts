"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function useFarcasterGate() {
  const { isConnected } = useAccount();
  const [blocked, setBlocked] = useState(true);

  useEffect(() => {
    setBlocked(!isConnected);
  }, [isConnected]);

  const message = "Please connect your wallet to continue.";

  return { blocked, message };
}