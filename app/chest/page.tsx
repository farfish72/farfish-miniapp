// app/chest/page.tsx
"use client";

import { useEffect } from "react";
import ChestView from "./ChestView";

export default function ChestPage() {
  // Farcaster environment detection for proper opening
  useEffect(() => {
    const isInFarcaster = 
      typeof navigator !== 'undefined' && /Farcaster|Warpcast/i.test(navigator.userAgent || "") ||
      typeof window !== 'undefined' && window.parent !== window ||
      typeof document !== 'undefined' && document.referrer?.includes('farcaster');
    
    if (isInFarcaster) {
      console.log('Chest page running in Farcaster environment');
    }
    
    // Prevent redirect to Chrome in Farcaster environment
    if (isInFarcaster && typeof window !== 'undefined' && window.top !== window.self) {
      console.log('Staying in Farcaster browser');
    }
  }, []);

  return <ChestView />;
}