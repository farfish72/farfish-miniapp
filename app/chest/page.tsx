// app/chest/page.tsx
"use client";

import { useEffect } from "react";
import ChestView from "./ChestView";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

export default function ChestPage() {
  const isFarcaster = useFarcasterEnvironment("Chest page");

  useEffect(() => {
    if (!isFarcaster) return;
    if (typeof window !== "undefined" && window.top !== window.self) {
      console.log("Staying in Farcaster browser");
    }
  }, [isFarcaster]);

  return <ChestView />;
}