"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { base } from "viem/chains";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChestCard from "../components/ChestCard";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { CLAIM_CONTROLLER_ADDRESS, STAKING_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import claimControllerAbi from "../abi/claimController.json";
import stakeAbi from "../abi/stake.json";

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
  const [claimingPosition, setClaimingPosition] = useState<{ tokenId: number; lockDays: number } | null>(null);

  // Read daily chest claim status
  const readDailyChest = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS as `0x${string}`,
    abi: claimControllerAbi as any,
    functionName: "canClaimDailyChest",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(isConnected && address && CLAIM_CONTROLLER_ADDRESS && isBaseNetwork),
      refetchInterval: 30000, // Refetch every 30 seconds
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
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  } as any);

  // Read staking positions for each token
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);
  
  const readToken0 = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfoForToken",
    args: address ? [0, address as `0x${string}`] : undefined,
    query: { enabled: readEnabled, refetchInterval: 30000, refetchOnMount: true, refetchOnReconnect: true, refetchOnWindowFocus: true },
  } as any);

  const readToken1 = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfoForToken",
    args: address ? [1, address as `0x${string}`] : undefined,
    query: { enabled: readEnabled, refetchInterval: 30000, refetchOnMount: true, refetchOnReconnect: true, refetchOnWindowFocus: true },
  } as any);

  const readToken2 = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfoForToken",
    args: address ? [2, address as `0x${string}`] : undefined,
    query: { enabled: readEnabled, refetchInterval: 30000, refetchOnMount: true, refetchOnReconnect: true, refetchOnWindowFocus: true },
  } as any);

  const readToken3 = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfoForToken",
    args: address ? [3, address as `0x${string}`] : undefined,
    query: { enabled: readEnabled, refetchInterval: 30000, refetchOnMount: true, refetchOnReconnect: true, refetchOnWindowFocus: true },
  } as any);

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

  // Parse staking positions
  const stakingPositions = useMemo(() => {
    const positions: Array<{ tokenId: number; name: string; displayLabel: string; lockDays: number; stakedAt: number; quantity: number; isVoided: boolean; canClaim: boolean; daysRemaining: number }> = [];
    
    const processToken = (tokenId: number, data: any) => {
      if (!data) return;
      const quantity = Number((data?.quantity ?? (Array.isArray(data) ? data[0] : 0)) ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      
      const stakedAt = Number((data?.stakedAt ?? (Array.isArray(data) ? data[1] : 0)) ?? 0);
      const lockDays = Number((data?.lockDays ?? (Array.isArray(data) ? data[2] : 0)) ?? 0);
      
      if (!Number.isFinite(stakedAt) || !Number.isFinite(lockDays) || lockDays <= 0) return;
      
      // Check if position is voided (unstaked before lock period)
      // We can't directly check this, but if stakedAt is 0 or invalid, consider it voided
      const isVoided = stakedAt <= 0;
      
      // Calculate if lock period is met
      const unlockTimestamp = stakedAt + (lockDays * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const canClaim = !isVoided && now >= unlockTimestamp;
      const daysRemaining = canClaim ? 0 : Math.ceil((unlockTimestamp - now) / (24 * 60 * 60 * 1000));
      
      const name = getNameFromTokenId(tokenId) ?? tokenName[tokenId] ?? "FarFISH";
      positions.push({
        tokenId,
        name,
        displayLabel: name,
        lockDays,
        stakedAt,
        quantity,
        isVoided,
        canClaim,
        daysRemaining: Math.max(0, daysRemaining),
      });
    };
    
    processToken(0, readToken0?.data);
    processToken(1, readToken1?.data);
    processToken(2, readToken2?.data);
    processToken(3, readToken3?.data);
    
    return positions;
  }, [readToken0?.data, readToken1?.data, readToken2?.data, readToken3?.data]);

  // Refetch all chest data
  const refetchAllChestData = useCallback(() => {
    (readDailyChest as any)?.refetch?.();
    (readSilverChest as any)?.refetch?.();
    (readToken0 as any)?.refetch?.();
    (readToken1 as any)?.refetch?.();
    (readToken2 as any)?.refetch?.();
    (readToken3 as any)?.refetch?.();
  }, [readDailyChest, readSilverChest, readToken0, readToken1, readToken2, readToken3]);

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
    if (isStakingTxSuccess && stakingTxHash && claimingPosition) {
      const rewardAmount = rewardAmounts[claimingPosition.tokenId]?.[claimingPosition.lockDays] || 0;
      setToast({ type: "success", message: `Staking reward claimed (${rewardAmount} FRH)` });
      // Clear claiming position immediately
      setClaimingPosition(null);
      // Immediate refetch for instant UI update
      setTimeout(() => {
        refetchAllChestData();
        router.refresh();
      }, 100);
    }
  }, [isStakingTxSuccess, stakingTxHash, claimingPosition, refetchAllChestData, router]);

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
      // Clear claiming position and refetch
      setClaimingPosition(null);
      setTimeout(() => refetchAllChestData(), 500);
    }
  }, [writeStakingError, refetchAllChestData]);

  // Clear states on unmount
  useEffect(() => {
    return () => {
      setClaimingPosition(null);
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

  const handleStakingClaim = useCallback((tokenId: number, lockDays: number) => {
    // Prevent double-claim: check if already pending or claiming
    if (isWriteStakingPending || isStakingTxConfirming || claimingPosition) {
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

    const position = stakingPositions.find(p => p.tokenId === tokenId && p.lockDays === lockDays);
    if (!position || !position.canClaim || position.isVoided) {
      return;
    }

    // Disable button immediately to prevent double-claim
    setClaimingPosition({ tokenId, lockDays });

    try {
      writeStakingClaim({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "claimRewards",
        args: [BigInt(tokenId)],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error("Staking claim error:", error);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
      // Clear claiming position on error
      setClaimingPosition(null);
    }
  }, [isConnected, address, isBaseNetwork, stakingPositions, isWriteStakingPending, isStakingTxConfirming, claimingPosition, writeStakingClaim]);

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
  const silverHasStaked = silverChestData?.hasStaked ?? false;
  const silverTimeUntilClaim = silverChestData?.timeUntilClaim ?? BigInt(0);
  const silverButtonDisabled = !isConnected || !isBaseNetwork || !silverHasStaked || !silverCanClaim || isWriteSilverPending || isSilverTxConfirming;
  const silverButtonLabel = isWriteSilverPending || isSilverTxConfirming
    ? "Claiming..."
    : !silverHasStaked
    ? "Stake NFTs to unlock"
    : silverCanClaim
    ? "Open now (6 FRH)"
    : `Next claim in: ${formatTimeUntilClaim(silverTimeUntilClaim)}`;
  const silverProgress = silverHasStaked && silverCanClaim ? 100 : silverHasStaked ? Math.max(0, 100 - Math.round((Number(silverTimeUntilClaim) / 86400) * 100)) : 0;

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

          {(readToken0?.isLoading || readToken1?.isLoading || readToken2?.isLoading || readToken3?.isLoading) && (
            <p className="text-sm text-white/70">Loading staking positions...</p>
          )}

          {!readToken0?.isLoading && !readToken1?.isLoading && !readToken2?.isLoading && !readToken3?.isLoading && stakingPositions.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/70 mb-3">You have no staked NFTs. Visit the Stake page to begin earning rewards.</p>
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
              {stakingPositions.map((position, idx) => {
                const rewardAmount = rewardAmounts[position.tokenId]?.[position.lockDays] || 0;
                const isClaiming = claimingPosition?.tokenId === position.tokenId && claimingPosition?.lockDays === position.lockDays;
                const isPending = isWriteStakingPending || isStakingTxConfirming;
                
                // If voided, show no claim button
                if (position.isVoided) {
                  return (
                    <div key={`${position.tokenId}-${position.lockDays}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{position.displayLabel} ({position.lockDays} Days)</p>
                          <p className="text-xs text-white/70">Quantity: {position.quantity}</p>
                          <p className="text-xs text-white/70">Staked: {position.stakedAt ? new Date(position.stakedAt).toLocaleDateString() : "—"}</p>
                          <p className="text-xs text-red-400 mt-1">Voided (unstaked)</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // If days remaining > 0, show disabled button
                if (position.daysRemaining > 0) {
                  return (
                    <div key={`${position.tokenId}-${position.lockDays}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{position.displayLabel} ({position.lockDays} Days)</p>
                          <p className="text-xs text-white/70">Quantity: {position.quantity}</p>
                          <p className="text-xs text-white/70">Staked: {position.stakedAt ? new Date(position.stakedAt).toLocaleDateString() : "—"}</p>
                          <p className="text-xs text-white/70 mt-1">🔒 {position.daysRemaining} day{position.daysRemaining !== 1 ? 's' : ''} remaining</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={true}
                        className="w-full rounded-lg py-2 text-sm font-semibold transition bg-white/10 text-white/40 cursor-not-allowed"
                      >
                        Requires {position.daysRemaining} day{position.daysRemaining !== 1 ? 's' : ''} to unlock
                      </button>
                    </div>
                  );
                }
                
                // If unlocked & not claimed, show enabled claim button
                // Note: We don't have a way to track if already claimed, so we show claim button if canClaim is true
                if (position.canClaim) {
                  // Fully lock button during any pending state or if this position is being claimed
                  const claimDisabled = isPending || isClaiming;
                  return (
                    <div key={`${position.tokenId}-${position.lockDays}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{position.displayLabel} ({position.lockDays} Days)</p>
                          <p className="text-xs text-white/70">Quantity: {position.quantity}</p>
                          <p className="text-xs text-white/70">Staked: {position.stakedAt ? new Date(position.stakedAt).toLocaleDateString() : "—"}</p>
                          <p className="text-xs text-green-400 mt-1">✅ Ready to claim ({rewardAmount} FRH)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claimDisabled}
                        onClick={() => {
                          // Double-check to prevent any race condition
                          if (!claimDisabled && !isPending && !isClaiming) {
                            handleStakingClaim(position.tokenId, position.lockDays);
                          }
                        }}
                        className={`w-full rounded-lg py-2 text-sm font-semibold transition ${
                          claimDisabled
                            ? "bg-white/10 text-white/40 cursor-not-allowed"
                            : "bg-emerald-400/80 text-black hover:bg-emerald-400"
                        }`}
                      >
                        {isClaiming ? "Claiming..." : `Claim ${rewardAmount} FRH reward`}
                      </button>
                    </div>
                  );
                }
                
                // Fallback (shouldn't reach here, but just in case)
                return (
                  <div key={`${position.tokenId}-${position.lockDays}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{position.displayLabel} ({position.lockDays} Days)</p>
                        <p className="text-xs text-white/70">Quantity: {position.quantity}</p>
                        <p className="text-xs text-white/70">Staked: {position.stakedAt ? new Date(position.stakedAt).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending state and tx link for staking claim */}
          {(isWriteStakingPending || isStakingTxConfirming) && claimingPosition && (
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
