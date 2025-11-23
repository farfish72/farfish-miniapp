"use client";
import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    try {
      sdk.actions.ready();
    } catch {}
  }, []);

  return null;
}
