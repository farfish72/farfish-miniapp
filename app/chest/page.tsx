// app/chest/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Link from "next/link";
import ChestCard from "../components/ChestCard";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { CLAIM_CONTROLLER_ADDRESS } from "../constants";
import claimControllerAbi from "../abi/claimController.json";
import useUserStakes from "../hooks/useUserStakes";

const BASE_CHAIN_ID = 8453;
const BASESCAN_URL = "https://basescan.org/tx";

const infoCopy = {
  bronze: "Claim 3 FRH token every 24 hours.",
  silver:
    "Stake at least 1 NFT to unlock. Active stakers can claim 6 FRH per day.",
  activity:
    "Monthly Activity Bonus! Accumulate tokens by completing quests or referrals. This reward pool unlocks on the 1st of every month. Don't forget to claim your hard-earned tokens!",
};

// Convert seconds to human-readable time string
const formatTimeUntilClaim = (seconds: bigint | number): string => {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (secs <= 0) return "0m";

  const totalSeconds = Math.ceil(secs);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secsRemaining = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secsRemaining}s`;
  } else {
    return `${secsRemaining}s`;
  }
};

export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isFarcaster = useFarcasterEnvironment("Chest page");
  const isBaseNetwork = chainId === BASE_CHAIN_ID;

  const [infoModal, setInfoModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Canonical stake lifecycle data – used only to check if user has staked NFTs for Stake Chest unlock.
  const { activeStakes, isLoading: isLoadingStakes } = useUserStakes();

  // Read daily chest claim status
  const readDailyChest = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
    abi: claimControllerAbi as any,
    functionName: "canClaimDailyChest",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(
        isConnected && address && CLAIM_CONTROLLER_ADDRESS && isBaseNetwork,
      ),
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  } as any);

  // Read silver chest claim status
  const readSilverChest = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
    abi: claimControllerAbi as any,
    functionName: "canClaimSilverChest",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(
        isConnected && address && CLAIM_CONTROLLER_ADDRESS && isBaseNetwork,
      ),
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  } as any);

  // Write contract hooks
  const {
    writeContract: writeDailyClaim,
    data: dailyTxHash,
    isPending: isWriteDailyPending,
    error: writeDailyError,
  } = useWriteContract();
  const {
    writeContract: writeSilverClaim,
    data: silverTxHash,
    isPending: isWriteSilverPending,
    error: writeSilverError,
  } = useWriteContract();

  // Wait for daily claim transaction
  const { isLoading: isDailyTxConfirming, isSuccess: isDailyTxSuccess } =
    useWaitForTransactionReceipt({
      hash: dailyTxHash,
    });

  // Wait for silver claim transaction
  const { isLoading: isSilverTxConfirming, isSuccess: isSilverTxSuccess } =
    useWaitForTransactionReceipt({
      hash: silverTxHash,
    });

  // Parse daily chest data
  const dailyChestData = useMemo(() => {
    if (!readDailyChest.data || !Array.isArray(readDailyChest.data)) return null;
    const [canClaim, timeUntilClaim] = readDailyChest.data;
    return {
      canClaim: Boolean(canClaim),
      timeUntilClaim:
        typeof timeUntilClaim === "bigint"
          ? timeUntilClaim
          : BigInt(timeUntilClaim || 0),
    };
  }, [readDailyChest.data]);

  // Parse silver chest data
  const silverChestData = useMemo(() => {
    if (!readSilverChest.data || !Array.isArray(readSilverChest.data))
      return null;
    const [canClaim, timeUntilClaim, hasStaked] = readSilverChest.data;
    return {
      canClaim: Boolean(canClaim),
      timeUntilClaim:
        typeof timeUntilClaim === "bigint"
          ? timeUntilClaim
          : BigInt(timeUntilClaim || 0),
      hasStaked: Boolean(hasStaked),
    };
  }, [readSilverChest.data]);

  // Handle daily claim transaction success – local-only updates
  useEffect(() => {
    if (isDailyTxSuccess && dailyTxHash) {
      setToast({ type: "success", message: "3 FRH claimed" });
      setTimeout(() => {
        (readDailyChest as any)?.refetch?.();
      }, 100);
    }
  }, [isDailyTxSuccess, dailyTxHash, readDailyChest]);

  // Handle silver claim transaction success – local-only updates
  useEffect(() => {
    if (isSilverTxSuccess && silverTxHash) {
      setToast({ type: "success", message: "6 FRH claimed" });
      setTimeout(() => {
        (readSilverChest as any)?.refetch?.();
      }, 100);
    }
  }, [isSilverTxSuccess, silverTxHash, readSilverChest]);

  // Handle write errors - clear states on error
  useEffect(() => {
    if (writeDailyError) {
      const errorMsg = writeDailyError.message || String(writeDailyError);
      if (
        errorMsg.includes("mint") ||
        errorMsg.includes("Mint") ||
        errorMsg.includes("revert")
      ) {
        setToast({
          type: "error",
          message: "Rewards temporarily unavailable — contact support.",
        });
        console.error("Daily claim error:", writeDailyError);
      } else {
        setToast({
          type: "error",
          message: `Transaction failed: ${errorMsg}`,
        });
      }
      setTimeout(() => (readDailyChest as any)?.refetch?.(), 500);
    }
  }, [writeDailyError, readDailyChest]);

  useEffect(() => {
    if (writeSilverError) {
      const errorMsg = writeSilverError.message || String(writeSilverError);
      if (
        errorMsg.includes("mint") ||
        errorMsg.includes("Mint") ||
        errorMsg.includes("revert")
      ) {
        setToast({
          type: "error",
          message: "Rewards temporarily unavailable — contact support.",
        });
        console.error("Silver claim error:", writeSilverError);
      } else {
        setToast({
          type: "error",
          message: `Transaction failed: ${errorMsg}`,
        });
      }
      setTimeout(() => (readSilverChest as any)?.refetch?.(), 500);
    }
  }, [writeSilverError, readSilverChest]);

  // Clear states on unmount
  useEffect(() => {
    return () => {
      setToast(null);
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Preserve Farcaster miniapp environment logging without blocking
  useEffect(() => {
    if (!isFarcaster) return;
    if (typeof window !== "undefined" && window.top !== window.self) {
      console.log("Staying in Farcaster browser");
    }
  }, [isFarcaster]);

  const openModal = (title: string, description: string) => {
    setInfoModal({ title, description });
  };

  const handleDailyClaim = useCallback(() => {
    // Prevent double-claim: check if already pending
    if (isWriteDailyPending || isDailyTxConfirming) {
      return;
    }

    if (!isConnected || !address) {
      setToast({ type: "error", message: "Please connect your wallet" });
      return;
    }

    if (!isBaseNetwork) {
      setToast({ type: "error", message: "Please switch to Base network" });
      return;
    }

    if (!CLAIM_CONTROLLER_ADDRESS) {
      setToast({
        type: "error",
        message: "Claim controller not configured",
      });
      return;
    }

    if (!dailyChestData?.canClaim) {
      return;
    }

    try {
      writeDailyClaim({
        address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
        abi: claimControllerAbi as any,
        functionName: "claimDailyChest",
        args: [],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (
        errorMsg.includes("mint") ||
        errorMsg.includes("Mint") ||
        errorMsg.includes("revert")
      ) {
        setToast({
          type: "error",
          message: "Rewards temporarily unavailable — contact support.",
        });
        console.error("Daily claim error:", error);
      } else {
        setToast({
          type: "error",
          message: `Transaction failed: ${errorMsg}`,
        });
      }
    }
  }, [
    isConnected,
    address,
    isBaseNetwork,
    dailyChestData,
    isWriteDailyPending,
    isDailyTxConfirming,
    writeDailyClaim,
  ]);

  const handleSilverClaim = useCallback(() => {
    // Prevent double-claim: check if already pending
    if (isWriteSilverPending || isSilverTxConfirming) {
      return;
    }

    if (!isConnected || !address) {
      setToast({ type: "error", message: "Please connect your wallet" });
      return;
    }

    if (!isBaseNetwork) {
      setToast({ type: "error", message: "Please switch to Base network" });
      return;
    }

    if (!CLAIM_CONTROLLER_ADDRESS) {
      setToast({
        type: "error",
        message: "Claim controller not configured",
      });
      return;
    }

    if (!silverChestData?.canClaim || !silverChestData?.hasStaked) {
      return;
    }

    try {
      writeSilverClaim({
        address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
        abi: claimControllerAbi as any,
        functionName: "claimSilverChest",
        args: [],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (
        errorMsg.includes("mint") ||
        errorMsg.includes("Mint") ||
        errorMsg.includes("revert")
      ) {
        setToast({
          type: "error",
          message: "Rewards temporarily unavailable — contact support.",
        });
        console.error("Silver claim error:", error);
      } else {
        setToast({
          type: "error",
          message: `Transaction failed: ${errorMsg}`,
        });
      }
    }
  }, [
    isConnected,
    address,
    isBaseNetwork,
    silverChestData,
    isWriteSilverPending,
    isSilverTxConfirming,
    writeSilverClaim,
  ]);

  // Daily Bronze card state - fully lock button during any pending state
  const dailyCanClaim = dailyChestData?.canClaim ?? false;
  const dailyTimeUntilClaim = dailyChestData?.timeUntilClaim ?? BigInt(0);
  const dailyButtonDisabled =
    !isConnected ||
    !isBaseNetwork ||
    !dailyCanClaim ||
    isWriteDailyPending ||
    isDailyTxConfirming;
  const dailyButtonLabel =
    isWriteDailyPending || isDailyTxConfirming
      ? "Claiming..."
      : dailyCanClaim
      ? "Open now (3 FRH)"
      : `Next claim in: ${formatTimeUntilClaim(dailyTimeUntilClaim)}`;
  const dailyProgress = dailyCanClaim
    ? 100
    : Math.max(
        0,
        100 - Math.round((Number(dailyTimeUntilClaim) / 86400) * 100),
      );

  // Silver Chest card state - fully lock button during any pending state
  const silverCanClaim = silverChestData?.canClaim ?? false;
  // Use activeStakes.length to control Stake Chest unlock state
  const silverHasStaked =
    Array.isArray(activeStakes) && activeStakes.length >= 1;
  const silverTimeUntilClaim = silverChestData?.timeUntilClaim ?? BigInt(0);
  const silverButtonDisabled =
    !isConnected ||
    !isBaseNetwork ||
    !silverHasStaked ||
    !silverCanClaim ||
    isWriteSilverPending ||
    isSilverTxConfirming;
  const silverButtonLabel =
    isWriteSilverPending || isSilverTxConfirming
      ? "Claiming..."
      : !silverHasStaked
      ? "Stake NFTs to unlock"
      : silverCanClaim
      ? "Open now (6 FRH)"
      : `Next claim in: ${formatTimeUntilClaim(silverTimeUntilClaim)}`;
  const silverProgress =
    silverHasStaked && silverCanClaim
      ? 100
      : silverHasStaked
      ? Math.max(
          0,
          100 - Math.round((Number(silverTimeUntilClaim) / 86400) * 100),
        )
      : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-white/70">
            Rewards refresh daily and monthly based on the FarFISH economy
            rules. Stay active, stake NFTs, and never miss a claim window.
          </p>
        </section>

        {/* Daily Bronze Chest */}
        <ChestCard
          title="Daily Bronze Chest"
          description={infoCopy.bronze}
          badge={dailyCanClaim ? "Ready" : "Cooling"}
          progress={dailyProgress}
          variant="bronze"
          actionLabel={dailyButtonLabel}
          actionDisabled={dailyButtonDisabled}
          onAction={handleDailyClaim}
          infoLabel="Info"
          onInfo={() => openModal("Daily Bronze Chest", infoCopy.bronze)}
        />

        {/* Pending state and tx link for daily */}
        {(isWriteDailyPending || isDailyTxConfirming) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/70">
              {isDailyTxConfirming
                ? "Confirming transaction..."
                : "Transaction pending..."}
            </p>
            {dailyTxHash && (
              <a
                href={`${BASESCAN_URL}/${dailyTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00d4c4] hover:underline mt-2 block"
              >
                View on BaseScan
              </a>
            )}
          </div>
        )}

        {/* Stake Chest (Silver) */}
        {!Array.isArray(activeStakes) || activeStakes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-2xl font-semibold">Stake Chest (Silver)</h3>
            <p className="text-sm text-white/70 mt-1">{infoCopy.silver}</p>
            <div className="mt-4">
              <Link
                href="/stake"
                className="w-full rounded-lg bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] py-3 font-semibold text-black text-center block"
              >
                Stake NFTs to unlock
              </Link>
            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-white/10 bg-transparent py-3 text-sm text-white/70 hover:bg-white/5 transition mt-3"
              onClick={() => openModal("Stake Chest (Silver)", infoCopy.silver)}
            >
              Info
            </button>
          </div>
        ) : Array.isArray(activeStakes) && activeStakes.length >= 1 ? (
          <ChestCard
            title="Stake Chest (Silver)"
            description={infoCopy.silver}
            badge={silverCanClaim ? "Ready" : "Cooling"}
            progress={silverProgress}
            variant="silver"
            actionLabel={silverButtonLabel}
            actionDisabled={silverButtonDisabled}
            onAction={handleSilverClaim}
            infoLabel="Info"
            onInfo={() => openModal("Stake Chest (Silver)", infoCopy.silver)}
          />
        ) : null}

        {/* Pending state and tx link for silver */}
        {(isWriteSilverPending || isSilverTxConfirming) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/70">
              {isSilverTxConfirming
                ? "Confirming transaction..."
                : "Transaction pending..."}
            </p>
            {silverTxHash && (
              <a
                href={`${BASESCAN_URL}/${silverTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00d4c4] hover:underline mt-2 block"
              >
                View on BaseScan
              </a>
            )}
          </div>
        )}

        {/* Activity Rewards — monthly airdrop (read-only if no claim function) */}
        <ChestCard
          title="Activity Rewards (Monthly)"
          description={infoCopy.activity}
          badge="Monthly"
          progress={0}
          actionLabel="Check eligibility on 1st"
          actionDisabled={true}
          infoLabel="Info"
          onInfo={() =>
            openModal("Activity Rewards (Monthly)", infoCopy.activity)
          }
        />

        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed bottom-4 left-4 right-4 z-50 text-xs font-semibold rounded-lg border p-3 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                : "bg-red-500/10 border-red-500/20 text-red-200"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>

      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-12 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050e18] p-5 shadow-2xl">
            <h4 className="text-lg font-semibold">{infoModal.title}</h4>
            <p className="mt-2 text-sm text-white/70">
              {infoModal.description}
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] py-3 text-sm font-semibold text-black"
              onClick={() => setInfoModal(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}