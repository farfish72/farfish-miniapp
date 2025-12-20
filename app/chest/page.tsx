"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "viem/chains";

import Header from "../components/Header";
import ChestCard from "../components/ChestCard";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

import claimControllerAbi from "../abi/claimController.json";
import silverChestAbi from "../abi/SilverChestClaimController.json";
import stakeAbi from "../abi/stake.json";

import { CLAIM_CONTROLLER_ADDRESS, STAKING_CONTRACT_ADDRESS } from "../constants";

const SILVER_CHEST_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SILVER_CLAIM_CONTRACT_ADDRESS as `0x${string}`;

const BASESCAN_URL = "https://basescan.org/tx";

/* ---------------- helpers ---------------- */
const formatTime = (seconds: bigint | number): string => {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (s <= 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ---------------- page ---------------- */
export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isBase = chainId === base.id;
  useFarcasterEnvironment("Chest");

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  /* =========================================================
     DAILY BRONZE — OLD CLAIM CONTROLLER (UNCHANGED)
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
      abi: claimControllerAbi as any,
      functionName: "claimDailyChest",
      args: [],
    } as any);
  }, [daily, dailyPending, dailyConfirming, claimDaily, address]);

  /* =========================================================
     SILVER CHEST — STAKEID BASED (CORRECT)
     ========================================================= */

  // 1. read eligibility + cooldown (contract handles logic)
  const { data: canClaimSilver } = useReadContract({
    address: SILVER_CHEST_CONTRACT_ADDRESS,
    abi: silverChestAbi,
    functionName: "canClaim",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  const { data: nextSilverTime } = useReadContract({
    address: SILVER_CHEST_CONTRACT_ADDRESS,
    abi: silverChestAbi,
    functionName: "nextClaimTime",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  // 2. write
  const {
    writeContract: claimSilver,
    data: silverTx,
    isPending: silverPending,
  } = useWriteContract();

  const { isLoading: silverConfirming } = useWaitForTransactionReceipt({
    hash: silverTx,
  });

  // 3. claim handler — stakeId REQUIRED
  const handleSilverClaim = useCallback(async () => {
    if (!canClaimSilver || silverPending || silverConfirming || !address) return;

    try {
      // get user's stakeIds
      const stakeIds = (await publicClient.readContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakeAbi as any,
        functionName: "getUserStakeIds",
        args: [address],
        account: address
      } as any)) as bigint[];

      if (!stakeIds || stakeIds.length === 0) {
        setToast({ type: "error", message: "No active stake found" });
        return;
      }

      // use first stakeId, contract validates rest
      claimSilver({
        address: SILVER_CHEST_CONTRACT_ADDRESS,
        abi: silverChestAbi as any,
        functionName: "claim",
        args: [stakeIds[0]],
      } as any);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Silver claim failed" });
    }
  }, [
    canClaimSilver,
    silverPending,
    silverConfirming,
    address,
    claimSilver,
    publicClient,
  ]);

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
          description="Active stakers can claim 6 FRH daily."
          variant="silver"
          badge={canClaimSilver ? "Ready" : "Cooling"}
          actionLabel={
            canClaimSilver
              ? "Claim 6 FRH"
              : `Next claim in: ${formatTime((nextSilverTime as bigint) ?? 0n)}`
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !canClaimSilver ||
            silverPending ||
            silverConfirming
          }
          onAction={handleSilverClaim}
        />

        {/* ACTIVITY REWARDS (MONTHLY) */}
        <ChestCard
          title="Activity Rewards (Monthly)"
          description="Earn rewards based on your monthly activity."
          variant="default"
          badge="Coming Soon"
          actionLabel="Claim Rewards"
          actionDisabled={true}
          onAction={() => {}}
        />

        {toast && (
          <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border p-3 text-xs font-semibold
            bg-emerald-500/10 border-emerald-500/20 text-emerald-200">
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
