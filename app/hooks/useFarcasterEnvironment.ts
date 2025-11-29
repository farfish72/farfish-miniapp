"use client";

import { useEffect, useState } from "react";
import { detectFarcasterEnvironment } from "../utils/farcaster";

export default function useFarcasterEnvironment(logLabel?: string) {
  const [isFarcaster, setIsFarcaster] = useState(false);

  useEffect(() => {
    const detected = detectFarcasterEnvironment();
    setIsFarcaster(detected);
    if (detected && logLabel) {
      console.log(`${logLabel} running in Farcaster environment`);
    }
  }, [logLabel]);

  return isFarcaster;
}

