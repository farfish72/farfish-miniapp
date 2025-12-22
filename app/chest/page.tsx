"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "viem/chains";

import Header from "../components/Header";
import ChestCard from "../components/ChestCard";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

import claimControllerAbi from "../abi/claimController.json";
import { CLAIM_CONTROLLER_ADDRESS } from "../constants";

/* ---------------- helpers ---------------- */
const formatTime = (seconds: bigint | number): string => {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!s || s <= 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ---------------- page ---------------- */
export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === base.id;

  useFarcasterEnvironment("Chest");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* =========================================================
     DAILY BRONZE — CLAIM CONTROLLER
     ========================================================= */
  const { data: dailyData } = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS,
    abi: claimControllerAbi,
    functionName: "canClaimDailyChest",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  const daily = useMemo(() => {
    if (!dailyData || !Array.isArray(dailyData)) return null;
    return {
      canClaim: Boolean(dailyData[0]),
      timeLeft: BigInt(dailyData[1]),
    };
  }, [dailyData]);

  const {
    writeContract: claimDaily,
    data: dailyTx,
    isPending: dailyPending,
  } = useWriteContract();

  const { isLoading: dailyConfirming } = useWaitForTransactionReceipt({
    hash: dailyTx,
  });

  const handleDailyClaim = useCallback(() => {
    if (!daily?.canClaim || dailyPending || dailyConfirming || !address) return;

    claimDaily({
      address: CLAIM_CONTROLLER_ADDRESS,
      abi: claimControllerAbi,
      functionName: "claimDailyChest",
      args: [],
      account: address,
      chain: base,
    });
  }, [daily, dailyPending, dailyConfirming, claimDaily, address]);

  /* =========================================================
     SILVER CHEST — SAME CLAIM CONTROLLER (ABI ONLY)
     ========================================================= */
  const { data: silverData } = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS,
    abi: claimControllerAbi,
    functionName: "canClaimSilverChest",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  const silver = useMemo(() => {
    if (!silverData || !Array.isArray(silverData)) return null;
    return {
      canClaim: Boolean(silverData[0]),
      timeLeft: BigInt(silverData[1]),
      hasStaked: Boolean(silverData[2]),
    };
  }, [silverData]);

  const {
    writeContract: claimSilver,
    data: silverTx,
    isPending: silverPending,
  } = useWriteContract();

  const { isLoading: silverConfirming } = useWaitForTransactionReceipt({
    hash: silverTx,
  });

  const handleSilverClaim = useCallback(() => {
    if (!silver?.canClaim || silverPending || silverConfirming || !address)
      return;

    claimSilver({
      address: CLAIM_CONTROLLER_ADDRESS,
      abi: claimControllerAbi,
      functionName: "claimSilverChest",
      args: [],
      account: address,
      chain: base,
    });
  }, [silver, silverPending, silverConfirming, claimSilver, address]);

  /* =========================================================
     TOASTS
     ========================================================= */
  useEffect(() => {
    if (dailyTx) setToast({ type: "success", message: "3 FRH claimed" });
    if (silverTx) setToast({ type: "success", message: "6 FRH claimed" });
  }, [dailyTx, silverTx]);

  /* ========================================================= */
  return (
    <div className="flex flex-col flex-1">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1">
        {/* DAILY BRONZE */}
        <ChestCard
          title="Daily Bronze Chest"
          description="Claim 3 FRH every 24 hours."
          variant="bronze"
          badge={daily?.canClaim ? "Ready" : "Cooling"}
          progress={daily?.canClaim ? 100 : 0}
          actionLabel={
            daily?.canClaim
              ? "Open now (3 FRH)"
              : `Next claim in: ${formatTime(daily?.timeLeft ?? 0n)}`
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !daily?.canClaim ||
            dailyPending ||
            dailyConfirming
          }
          onAction={handleDailyClaim}
        />

        {/* SILVER CHEST */}
        <ChestCard
          title="Silver Chest"
          description="Stake at least 1 NFT to claim 6 FRH daily."
          variant="silver"
          badge={
            !silver?.hasStaked
              ? "Stake required"
              : silver?.canClaim
              ? "Ready"
              : "Cooling"
          }
          actionLabel={
            silver?.canClaim
              ? "Claim 6 FRH"
              : `Next claim in: ${formatTime(silver?.timeLeft ?? 0n)}`
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !silver?.hasStaked ||
            !silver?.canClaim ||
            silverPending ||
            silverConfirming
          }
          onAction={handleSilverClaim}
        />

        {/* ACTIVITY (READ ONLY) */}
        <ChestCard
          title="Activity Rewards (Airdrop and referral)"
          description="Monthly rewards based on activity."
          badge="Coming Soon"
          actionLabel="Not available"
          actionDisabled
          onAction={() => {}}
        />

        {toast && (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border p-3 text-xs font-semibold bg-emerald-500/10 border-emerald-500/20 text-emerald-200">
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
