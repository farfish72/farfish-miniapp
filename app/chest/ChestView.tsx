"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { base } from "viem/chains";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import ChestCard from "../components/ChestCard";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { CLAIM_CONTROLLER_ADDRESS, STAKING_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import claimControllerAbi from "../abi/claimController.json";
import stakeAbi from "../abi/stake.json";
import { formatUnits } from "viem";

const BASE_CHAIN_ID = 8453;
const BASESCAN_URL = "https://basescan.org/tx";

const infoCopy = {
  bronze: "Claim 3 FRH token every 24 hours.",
  silver: "Stake at least 1 NFT to unlock. Active stakers can claim 6 FRH per day.",
  activity: "Monthly Activity Bonus! Accumulate points by completing quests. This reward pool unlocks on the 1st of every month. Don't forget to claim your hard-earned tokens!",
  staking: "Yield from your Staked NFTs. Rewards are based on the rarity of your cards (Common to Legendary). Legendary NFTs earn the highest APY. Claims open monthly on the 1st.",
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

const tokenName = {
  0: "BlueFin",
  1: "GoldRay",
  2: "RedSpike",
  3: "ShadowGill",
} as Record<number, string>;

// Reward amounts by tokenId and lockDays (from stake page table)
const rewardAmounts: Record<number, Record<number, number>> = {
  0: { 30: 120, 90: 240, 180: 480, 360: 960 },
  1: { 30: 240, 90: 480, 180: 960, 360: 1920 },
  2: { 30: 480, 90: 960, 180: 1920, 360: 3840 },
  3: { 30: 960, 90: 1920, 180: 3840, 360: 7680 },
};

export default function ChestView() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const isBaseNetwork = chainId === BASE_CHAIN_ID;
  useFarcasterEnvironment("ChestView");

  const [infoModal, setInfoModal] = useState<{ title: string; description: string } | null>(null);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [claimingStakeId, setClaimingStakeId] = useState<bigint | null>(null);
  const [stakingPositions, setStakingPositions] = useState<Array<{
    stakeId: bigint;
    tokenId: number;
    lockDuration: bigint;
    startTime: bigint;
    unstaked: boolean;
    claimed: boolean;
    rewardAmount: bigint;
    unlockTimestamp: bigint;
  }>>([]);
  const [isLoadingStakingPositions, setIsLoadingStakingPositions] = useState(false);
  const [stakingPositionsError, setStakingPositionsError] = useState(false);

  // Read daily chest claim status
  const readDailyChest = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
    abi: claimControllerAbi as any,
    functionName: "canClaimDailyChest",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(isConnected && address && CLAIM_CONTROLLER_ADDRESS && isBaseNetwork),
      // Removed aggressive polling to avoid stacked calls; refetch on demand
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
      enabled: Boolean(isConnected && address && CLAIM_CONTROLLER_ADDRESS && isBaseNetwork),
      // Removed aggressive polling to avoid stacked calls; refetch on demand
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  } as any);

  // Read staking positions using getUserStakeIds + getStakeInfo
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);
  
  const { data: stakeIds, refetch: refetchStakeIds } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getUserStakeIds",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: readEnabled,
      // Avoid background polling; manual refetch after tx / navigation
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  } as any);

  // Fetch stake info for each stakeId
  useEffect(() => {
    const fetchStakeInfos = async () => {
      if (!readEnabled) {
        setStakingPositions([]);
        setStakingPositionsError(false);
        setIsLoadingStakingPositions(false);
        return;
      }

      try {
        setStakingPositionsError(false);

        if (!stakeIds || !Array.isArray(stakeIds) || stakeIds.length === 0) {
          setStakingPositions([]);
          setIsLoadingStakingPositions(false);
          return;
        }

        const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
        if (!publicClient) return;

        setIsLoadingStakingPositions(true);

        const results = await Promise.all(
          (stakeIds as bigint[]).map(async (stakeId) => {
            try {
              const data = await (publicClient.readContract as any)({
                address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
                abi: stakeAbi as any,
                functionName: "getStakeInfo",
                args: [stakeId],
              });

              if (!data || typeof data !== "object") return null;

              const [
                staker,
                tokenId,
                amount,
                stakeTimestamp,
                lockDuration,
                unlockTimestamp,
                rewardAmount,
                claimed,
                unstaked,
              ] = data as any[];

              if (!staker || staker.toLowerCase() !== (address || "").toLowerCase()) {
                return null;
              }

              return {
                stakeId,
                tokenId: Number(tokenId ?? 0),
                lockDuration: BigInt(lockDuration ?? 0),
                startTime: BigInt(stakeTimestamp ?? 0),
                unstaked: Boolean(unstaked),
                claimed: Boolean(claimed),
                rewardAmount: BigInt(rewardAmount ?? 0),
                unlockTimestamp: BigInt(unlockTimestamp ?? 0),
              };
            } catch (err) {
              console.error("Failed to fetch stake info for id", stakeId, err);
              return null;
            }
          })
        );

        setStakingPositions(results.filter(Boolean) as Array<{
          stakeId: bigint;
          tokenId: number;
          lockDuration: bigint;
          startTime: bigint;
          unstaked: boolean;
          claimed: boolean;
          rewardAmount: bigint;
          unlockTimestamp: bigint;
        }>);
      } catch (error) {
        console.error("Failed to fetch stake infos:", error);
        // Preserve any previously loaded positions so we never misreport \"no positions\" on transient error.
        setStakingPositionsError(true);
      } finally {
        setIsLoadingStakingPositions(false);
      }
    };

    fetchStakeInfos();
  }, [readEnabled, stakeIds, address]);

  // Write contract hooks
  const { writeContract: writeDailyClaim, data: dailyTxHash, isPending: isWriteDailyPending, error: writeDailyError } = useWriteContract();
  const { writeContract: writeSilverClaim, data: silverTxHash, isPending: isWriteSilverPending, error: writeSilverError } = useWriteContract();
  const { writeContract: writeStakingClaim, data: stakingTxHash, isPending: isWriteStakingPending, error: writeStakingError } = useWriteContract();

  // Wait for daily claim transaction
  const { isLoading: isDailyTxConfirming, isSuccess: isDailyTxSuccess } = useWaitForTransactionReceipt({
    hash: dailyTxHash,
  });

  // Wait for silver claim transaction
  const { isLoading: isSilverTxConfirming, isSuccess: isSilverTxSuccess } = useWaitForTransactionReceipt({
    hash: silverTxHash,
  });

  // Wait for staking claim transaction
  const { isLoading: isStakingTxConfirming, isSuccess: isStakingTxSuccess } = useWaitForTransactionReceipt({
    hash: stakingTxHash,
  });

  // Parse daily chest data
  const dailyChestData = useMemo(() => {
    if (!readDailyChest.data || !Array.isArray(readDailyChest.data)) return null;
    const [canClaim, timeUntilClaim] = readDailyChest.data;
    return {
      canClaim: Boolean(canClaim),
      timeUntilClaim: typeof timeUntilClaim === "bigint" ? timeUntilClaim : BigInt(timeUntilClaim || 0),
    };
  }, [readDailyChest.data]);

  // Parse silver chest data
  const silverChestData = useMemo(() => {
    if (!readSilverChest.data || !Array.isArray(readSilverChest.data)) return null;
    const [canClaim, timeUntilClaim, hasStaked] = readSilverChest.data;
    return {
      canClaim: Boolean(canClaim),
      timeUntilClaim: typeof timeUntilClaim === "bigint" ? timeUntilClaim : BigInt(timeUntilClaim || 0),
      hasStaked: Boolean(hasStaked),
    };
  }, [readSilverChest.data]);

  // Refetch all chest data
  const refetchAllChestData = useCallback(() => {
    (readDailyChest as any)?.refetch?.();
    (readSilverChest as any)?.refetch?.();
    refetchStakeIds();
  }, [readDailyChest, readSilverChest, refetchStakeIds]);

  // Also listen for global staking updates so chest eligibility and staking-derived rewards
  // stay in sync with on-chain state even after stake/unstake on the Stake page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      refetchAllChestData();
    };
    window.addEventListener("farfish:staking-updated", handler);
    return () => {
      window.removeEventListener("farfish:staking-updated", handler);
    };
  }, [refetchAllChestData]);

  // Refetch on mount and when address changes (navigation back)
  useEffect(() => {
    if (isConnected && address && isBaseNetwork) {
      refetchAllChestData();
    }
  }, [isConnected, address, isBaseNetwork, refetchAllChestData]);

  // Handle daily claim transaction success
  useEffect(() => {
    if (isDailyTxSuccess && dailyTxHash) {
      setToast({ type: "success", message: "3 FRH claimed" });
      // Immediate refetch for instant UI update
      setTimeout(() => {
        refetchAllChestData();
        router.refresh();
      }, 100);
    }
  }, [isDailyTxSuccess, dailyTxHash, refetchAllChestData, router]);

  // Handle silver claim transaction success
  useEffect(() => {
    if (isSilverTxSuccess && silverTxHash) {
      setToast({ type: "success", message: "6 FRH claimed" });
      // Immediate refetch for instant UI update
      setTimeout(() => {
        refetchAllChestData();
        router.refresh();
      }, 100);
    }
  }, [isSilverTxSuccess, silverTxHash, refetchAllChestData, router]);

  // Handle staking claim transaction success
  useEffect(() => {
    if (isStakingTxSuccess && stakingTxHash && claimingStakeId) {
      const position = stakingPositions.find(p => p.stakeId === claimingStakeId);
      const rewardAmount = position ? formatUnits(position.rewardAmount, 18) : "0";
      setToast({ type: "success", message: `Staking reward claimed (${rewardAmount} FRH)` });
      // Clear claiming stakeId immediately
      setClaimingStakeId(null);
      // Immediate refetch for instant UI update
      setTimeout(() => {
        refetchAllChestData();
        router.refresh();
      }, 100);
    }
  }, [isStakingTxSuccess, stakingTxHash, claimingStakeId, stakingPositions, refetchAllChestData, router]);

  // Handle write errors - clear states on error
  useEffect(() => {
    if (writeDailyError) {
      const errorMsg = writeDailyError.message || String(writeDailyError);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
        console.error("Daily claim error:", writeDailyError);
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
      // Refetch to ensure state is correct after error
      setTimeout(() => refetchAllChestData(), 500);
    }
  }, [writeDailyError, refetchAllChestData]);

  useEffect(() => {
    if (writeSilverError) {
      const errorMsg = writeSilverError.message || String(writeSilverError);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
        console.error("Silver claim error:", writeSilverError);
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
      // Refetch to ensure state is correct after error
      setTimeout(() => refetchAllChestData(), 500);
    }
  }, [writeSilverError, refetchAllChestData]);

  useEffect(() => {
    if (writeStakingError) {
      const errorMsg = writeStakingError.message || String(writeStakingError);
      console.error("Staking claim error:", writeStakingError);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
      // Clear claiming stakeId and refetch
      setClaimingStakeId(null);
      setTimeout(() => refetchAllChestData(), 500);
    }
  }, [writeStakingError, refetchAllChestData]);

  // Clear states on unmount
  useEffect(() => {
    return () => {
      setClaimingStakeId(null);
      setToast(null);
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
      setToast({ type: "error", message: "Claim controller not configured" });
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
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
        console.error("Daily claim error:", error);
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  }, [isConnected, address, isBaseNetwork, dailyChestData, isWriteDailyPending, isDailyTxConfirming, writeDailyClaim]);

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
      setToast({ type: "error", message: "Claim controller not configured" });
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
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
        console.error("Silver claim error:", error);
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  }, [isConnected, address, isBaseNetwork, silverChestData, isWriteSilverPending, isSilverTxConfirming, writeSilverClaim]);

  const handleStakingClaim = useCallback((stakeId: bigint) => {
    // Prevent double-claim: check if already pending or claiming
    if (isWriteStakingPending || isStakingTxConfirming || claimingStakeId) {
      return;
    }

    // Preconditions check
    if (!isConnected || !address) {
      setToast({ type: "error", message: "Please connect your wallet" });
      return;
    }

    if (!isBaseNetwork) {
      setToast({ type: "error", message: "Please switch to Base network (chainId 8453)" });
      return;
    }

    if (!STAKING_CONTRACT_ADDRESS) {
      setToast({ type: "error", message: "Staking contract not configured" });
      return;
    }

    // Disable button immediately to prevent double-claim
    setClaimingStakeId(stakeId);

    try {
      writeStakingClaim({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "claim",
        args: [stakeId],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error("Staking claim error:", error);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
      // Clear claiming stakeId on error
      setClaimingStakeId(null);
    }
  }, [isConnected, address, isBaseNetwork, isWriteStakingPending, isStakingTxConfirming, claimingStakeId, writeStakingClaim]);

  // Daily Bronze card state - fully lock button during any pending state
  const dailyCanClaim = dailyChestData?.canClaim ?? false;
  const dailyTimeUntilClaim = dailyChestData?.timeUntilClaim ?? BigInt(0);
  const dailyButtonDisabled = !isConnected || !isBaseNetwork || !dailyCanClaim || isWriteDailyPending || isDailyTxConfirming;
  const dailyButtonLabel = isWriteDailyPending || isDailyTxConfirming
    ? "Claiming..."
    : dailyCanClaim
    ? "Open now (3 FRH)"
    : `Next claim in: ${formatTimeUntilClaim(dailyTimeUntilClaim)}`;
  const dailyProgress = dailyCanClaim ? 100 : Math.max(0, 100 - Math.round((Number(dailyTimeUntilClaim) / 86400) * 100));

  // Silver Chest card state - fully lock button during any pending state
  const silverCanClaim = silverChestData?.canClaim ?? false;
  // Derive hasStaked strictly from on-chain staking state (getUserStakeIds + getStakeInfo),
  // not from local UI assumptions or token ownership. stakeId=0 is included naturally here.
  const silverHasStaked = useMemo(
    () => stakingPositions.some((p) => !p.unstaked),
    [stakingPositions],
  );
  const silverTimeUntilClaim = silverChestData?.timeUntilClaim ?? BigInt(0);
  const silverButtonDisabled = !isConnected || !isBaseNetwork || !silverHasStaked || !silverCanClaim || isWriteSilverPending || isSilverTxConfirming;
  const silverButtonLabel = isWriteSilverPending || isSilverTxConfirming
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
      ? Math.max(0, 100 - Math.round((Number(silverTimeUntilClaim) / 86400) * 100))
      : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-white/70">
            Rewards refresh daily and monthly based on the FarFISH economy rules. Stay active, stake NFTs, and
            never miss a claim window.
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
              {isDailyTxConfirming ? "Confirming transaction..." : "Transaction pending..."}
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
        {!silverHasStaked && isConnected ? (
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
        ) : (
          <ChestCard
            title="Stake Chest (Silver)"
            description={infoCopy.silver}
            badge={silverHasStaked ? (silverCanClaim ? "Ready" : "Cooling") : "Locked"}
            progress={silverProgress}
            variant="silver"
            actionLabel={silverButtonLabel}
            actionDisabled={silverButtonDisabled}
            onAction={handleSilverClaim}
            infoLabel="Info"
            onInfo={() => openModal("Stake Chest (Silver)", infoCopy.silver)}
          />
        )}

        {/* Pending state and tx link for silver */}
        {(isWriteSilverPending || isSilverTxConfirming) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/70">
              {isSilverTxConfirming ? "Confirming transaction..." : "Transaction pending..."}
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
          onInfo={() => openModal("Activity Rewards (Monthly)", infoCopy.activity)}
        />

        {/* NFT Staking Rewards — per-position claim list */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-2xl font-semibold">NFT Staking Rewards</h3>
              <p className="text-sm text-white/70 mt-1">{infoCopy.staking}</p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                {stakingPositions.length > 0 ? `${stakingPositions.length} Position${stakingPositions.length !== 1 ? 's' : ''}` : 'No Positions'}
              </span>
            </div>
          </div>

          {isLoadingStakingPositions && (
            <p className="text-sm text-white/70">Loading staking positions...</p>
          )}

          {!isLoadingStakingPositions && stakingPositionsError && stakingPositions.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-red-400 mb-1">Failed to load your staking positions. Please try again.</p>
            </div>
          )}

          {!isLoadingStakingPositions && !stakingPositionsError && stakingPositions.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/70 mb-3">
                You have no staked NFTs. Visit the Stake page to begin earning rewards.
              </p>
              <Link
                href="/stake"
                className="inline-block text-sm text-[#00d4c4] hover:underline"
              >
                Go to Stake page →
              </Link>
            </div>
          )}

          {stakingPositions.length > 0 && (
            <div className="mt-4 space-y-3">
              {stakingPositions
                .filter(p => !p.unstaked)
                .map((position) => {
                  const nftName = getNameFromTokenId(position.tokenId) ?? "FarFISH";
                  const lockDays = Number(position.lockDuration) / (24 * 60 * 60);
                  const isClaiming = claimingStakeId === position.stakeId;
                  const isPending = isWriteStakingPending || isStakingTxConfirming;
                  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
                  const isUnlocked = position.unlockTimestamp <= currentTimestamp;
                  const rewardAmountFormatted = formatUnits(position.rewardAmount, 18);
                  
                  // Calculate status
                  let status: "Locked" | "Unlockable" | "Unstaked" = "Locked";
                  if (position.unstaked) {
                    status = "Unstaked";
                  } else if (isUnlocked) {
                    status = "Unlockable";
                  }

                  return (
                    <div key={position.stakeId.toString()} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{nftName} ({lockDays} Days)</p>
                          <p className="text-xs text-white/70">Stake #{position.stakeId.toString()}</p>
                          <p className="text-xs text-white/70">Status: {status}</p>
                          {position.rewardAmount > BigInt(0) && (
                            <p className="text-xs text-white/70 mt-1">
                              Reward: <span className="font-semibold text-[#00d4c4]">{rewardAmountFormatted} FRH</span>
                              {position.claimed ? " (claimed)" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      {!position.unstaked && (
                        <button
                          type="button"
                          disabled={isPending || isClaiming || position.claimed}
                          onClick={() => {
                            if (!isPending && !isClaiming && !position.claimed) {
                              handleStakingClaim(position.stakeId);
                            }
                          }}
                          className={`w-full rounded-lg py-2 text-sm font-semibold transition ${
                            isPending || isClaiming || position.claimed
                              ? "bg-white/10 text-white/40 cursor-not-allowed"
                              : "bg-emerald-400/80 text-black hover:bg-emerald-400"
                          }`}
                        >
                          {isClaiming ? "Claiming..." : position.claimed ? "Claimed" : `Claim ${rewardAmountFormatted} FRH reward`}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Pending state and tx link for staking claim */}
          {(isWriteStakingPending || isStakingTxConfirming) && claimingStakeId && (
            <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-sm text-white/70">
                {isStakingTxConfirming ? "Confirming transaction..." : "Transaction pending..."}
              </p>
              {stakingTxHash && (
                <a
                  href={`${BASESCAN_URL}/${stakingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#00d4c4] hover:underline mt-2 block"
                >
                  View on BaseScan
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            className="w-full rounded-lg border border-white/10 bg-transparent py-3 text-sm text-white/70 hover:bg-white/5 transition mt-4"
            onClick={() => openModal("NFT Staking Rewards", infoCopy.staking)}
          >
            Info
          </button>
        </div>

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
            <p className="mt-2 text-sm text-white/70">{infoModal.description}</p>
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
