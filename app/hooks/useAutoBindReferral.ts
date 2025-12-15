"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

/**
 * Minimal auto-referral hook.
 *
 * When a user connects their wallet on a URL containing ?ref=XXXXXXXX,
 * this hook will POST { wallet, refCode } once per connection to
 * /api/referral/record so the backend can store referral:{wallet}
 * with the referrer and timestamp.
 */
export default function useAutoBindReferral() {
  const { address, isConnected } = useAccount();
  const hasRecorded = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isConnected || !address) {
      hasRecorded.current = false;
      return;
    }

    // Only record once per wallet connection
    if (hasRecorded.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (!refCode || refCode.length !== 8) return;

    const recordReferral = async () => {
      try {
        const res = await fetch("/api/referral/record", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wallet: address, refCode }),
        });

        if (res.ok) {
          hasRecorded.current = true;
        }
      } catch (error) {
        console.error("Referral recording failed:", error);
      }
    };

    recordReferral();
  }, [address, isConnected]);
}
