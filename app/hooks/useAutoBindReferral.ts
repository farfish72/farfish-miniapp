"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

/**
 * Auto-bind referral from URL param ?ref=xxx when wallet connects
 * Blocks self-referral
 */
export default function useAutoBindReferral() {
  const { address, isConnected } = useAccount();
  const hasAutoBound = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isConnected || !address) {
      hasAutoBound.current = false;
      return;
    }

    // Only bind once per wallet connection
    if (hasAutoBound.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (!refCode || refCode.length !== 8) return;

    // Auto-bind referral
    const bindReferral = async () => {
      try {
        // Lookup wallet address from refCode (last 8 chars of wallet)
        
        // Check if already bound
        const checkRes = await fetch(`/api/referral/link?user=${address}`, {
          headers: { "x-user-wallet": address },
          cache: "no-store",
        });
        
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.bound) {
            hasAutoBound.current = true;
            return; // Already bound
          }
        }

        // Find wallet by refCode (last 8 chars of wallet)
        const walletRes = await fetch(`/api/referral/wallet-by-code?code=${refCode}`, {
          cache: "no-store",
        });

        if (!walletRes.ok) {
          // RefCode not found or invalid
          return;
        }

        const walletData = await walletRes.json();
        const referrerWallet = walletData.wallet;

        if (!referrerWallet) return;

        // Block self-referral
        if (referrerWallet.toLowerCase() === address.toLowerCase()) {
          return;
        }

        // Record referral using the new record endpoint (single source of truth)
        // This immediately counts the referral and updates leaderboard
        const recordRes = await fetch("/api/referral/record", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-wallet": address,
          },
          body: JSON.stringify({ refCode }),
        });

        if (recordRes.ok || recordRes.status === 409) {
          hasAutoBound.current = true;
        }
      } catch (error) {
        console.error("Auto-bind referral failed:", error);
      }
    };

    bindReferral();
  }, [address, isConnected]);
}
