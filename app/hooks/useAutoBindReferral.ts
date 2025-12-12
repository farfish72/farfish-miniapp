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

    if (!refCode || refCode.length !== 6) return;

    // Auto-bind referral
    const bindReferral = async () => {
      try {
        // Lookup wallet address from refCode
        // Since refCode is last 6 chars of wallet, we need to find matching wallet
        // For now, we'll store refCode -> wallet mapping, or reverse lookup
        // But for simplicity, we'll assume refCode maps to a wallet's last 6 chars
        
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

        // Find wallet by refCode (last 6 chars match)
        // We'll use a lookup API or try to reverse it
        // For now, let's try to get the referrer wallet from the refCode
        // This requires a new API endpoint: GET /api/referral/wallet-by-code?code=xxx
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

        // Bind referral using refCode
        const bindRes = await fetch("/api/referral/bind", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-wallet": address,
          },
          body: JSON.stringify({ refCode }),
        });

        if (bindRes.ok || bindRes.status === 409) {
          hasAutoBound.current = true;
        }
      } catch (error) {
        console.error("Auto-bind referral failed:", error);
      }
    };

    bindReferral();
  }, [address, isConnected]);
}
