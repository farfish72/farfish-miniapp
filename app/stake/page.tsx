// app/stake/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { useAccount, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import { base } from "viem/chains";
import { formatUnits } from "viem";
import { STAKING_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import stakeAbi from "../abi/stake.json";
import StakeModal from "../components/StakeModal";
import UnstakeModal from "../components/UnstakeModal";
import StakeTable from "../components/StakeTable";

const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () => {
  return process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
};

interface RawStakeInfo {
  stakeId: bigint;
  staker: string;
  tokenId: bigint;
  amount: bigint;
  stakeTimestamp: bigint;
  lockDuration: bigint;
  unlockTimestamp: bigint;
  rewardAmount: bigint;
  claimed: boolean;
  unstaked: boolean;
}

interface StakedPosition {
  stakeId: bigint;
  tokenId: number;
  amount: bigint;
  stakeTimestamp: bigint;
  lockDuration: bigint;
  unlockTimestamp: bigint;
  rewardAmount: bigint;
  claimed: boolean;
  unstaked: boolean;
  isUnlocked: boolean;
  lockDaysDisplay: string; // Remaining time until unlock
  rewardsDisplay: string; // Pre-formatted rewards string
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [selectedUnstakePosition, setSelectedUnstakePosition] = useState<StakedPosition | null>(null);
  const [stakeInfos, setStakeInfos] = useState<RawStakeInfo[]>([]);
  const [isLoadingStakeInfos, setIsLoadingStakeInfos] = useState(false);
  const [stakeInfosError, setStakeInfosError] = useState(false);
  const [claimingStakeId, setClaimingStakeId] = useState<bigint | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Get user's stake IDs
  const { data: stakeIds, refetch: refetchStakeIds, isLoading: isLoadingStakeIds } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getUserStakeIds",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: readEnabled,
      // Removed periodic polling to avoid stacked calls; manual refetch after tx
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  } as any);

  // Keep stakeInfos as "last known good" data and NEVER clear them on transient
  // disabled reads or undefined stakeIds, otherwise React/Wagmi hydration races
  // can briefly report "no stake" even though on-chain state is unchanged.
  // Fetch stake info tuples for each stakeId
  useEffect(() => {
    const fetchStakeInfos = async () => {
      if (!readEnabled) {
        // Do NOT wipe stakeInfos here; readEnabled can flap during hydration or
        // short network glitches and we must preserve previously loaded positions.
        return;
      }

      try {
        setStakeInfosError(false);

        if (!stakeIds) {
          // When stakeIds is temporarily undefined during initial mount or refetch,
          // keep existing stakeInfos to avoid a false "no staked NFTs" UI.
          return;
        }

        if (Array.isArray(stakeIds) && stakeIds.length === 0) {
          // getUserStakeIds is the single source of truth; an explicit empty
          // array means the user truly has no active stakes.
          setStakeInfos([]);
          return;
        }

        const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
        if (!publicClient) return;

        setIsLoadingStakeInfos(true);
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

              return {
                stakeId,
                staker: staker as string,
                tokenId: BigInt(tokenId ?? 0),
                amount: BigInt(amount ?? 0),
                stakeTimestamp: BigInt(stakeTimestamp ?? 0),
                lockDuration: BigInt(lockDuration ?? 0),
                unlockTimestamp: BigInt(unlockTimestamp ?? 0),
                rewardAmount: BigInt(rewardAmount ?? 0),
                claimed: Boolean(claimed),
                unstaked: Boolean(unstaked),
              } as RawStakeInfo;
            } catch (err) {
              console.error("Failed to fetch stake info for id", stakeId, err);
              return null;
            }
          })
        );

        setStakeInfos(results.filter(Boolean) as RawStakeInfo[]);
      } catch (error) {
        console.error("Failed to fetch stake infos:", error);
        // Preserve any previously loaded stakeInfos so the UI never lies with a false \"no stake\" state.
        setStakeInfosError(true);
      } finally {
        setIsLoadingStakeInfos(false);
      }
    };

    fetchStakeInfos();
  }, [readEnabled, stakeIds]);

  // Listen for global staking lifecycle updates so this page always refetches
  // getUserStakeIds when any stake/unstake/claim succeeds elsewhere in the app.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      if (!readEnabled) return;
      refetchStakeIds();
    };

    window.addEventListener("farfish:staking-updated", handler);
    return () => {
      window.removeEventListener("farfish:staking-updated", handler);
    };
  }, [readEnabled, refetchStakeIds]);

  // Get current block timestamp
  const [currentBlockTimestamp, setCurrentBlockTimestamp] = useState<bigint | null>(null);

  useEffect(() => {
    if (!readEnabled) {
      setCurrentBlockTimestamp(null);
      return;
    }

    const fetchBlockTimestamp = async () => {
      try {
        const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
        if (!publicClient) return;
        
        const block = await publicClient.getBlock({ blockTag: "latest" });
        if (block?.timestamp) {
          setCurrentBlockTimestamp(block.timestamp);
        }
      } catch (error) {
        console.error("Failed to fetch block timestamp:", error);
        // Fallback to current time in seconds
        setCurrentBlockTimestamp(BigInt(Math.floor(Date.now() / 1000)));
      }
    };

    fetchBlockTimestamp();
    const interval = setInterval(fetchBlockTimestamp, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [readEnabled]);

  // Calculate lock days display string (function with guards)
  const calculateLockDaysDisplay = (unlockTimestamp: bigint | undefined, currentBlock: bigint | null): string => {
    if (!unlockTimestamp || !currentBlock) return "—";
    if (unlockTimestamp <= currentBlock) return "Unlocked";

    try {
      const remainingSeconds = unlockTimestamp - currentBlock;
      const days = Number(remainingSeconds) / 86400;

      if (!Number.isFinite(days) || days <= 0) return "—";

      return `${Math.ceil(days)} days`;
    } catch (error) {
      console.error("Error calculating lock days:", error);
      return "—";
    }
  };

  // Format rewards using formatUnits (function with guards)
  const formatRewards = (rewards: bigint | undefined): string => {
    if (!rewards || rewards === BigInt(0)) return "0";
    
    try {
      // Use formatUnits with 18 decimals
      const formatted = formatUnits(rewards, 18);
      // Convert to number for toLocaleString, then back to string
      const num = parseFloat(formatted);
      if (!Number.isFinite(num)) return "0";
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } catch (error) {
      console.error("Error formatting rewards:", error);
      return "0";
    }
  };

  // Combine positions with detailed info - only include tokens that are actually staked
  const stakedPositions: StakedPosition[] = useMemo(() => {
    if (!stakeInfos.length) return [];

    return stakeInfos
      .filter((info) => info.staker?.toLowerCase() === (address || "").toLowerCase() && !info.unstaked)
      .map((info) => {
        const isUnlocked = currentBlockTimestamp ? info.unlockTimestamp <= currentBlockTimestamp : false;
        const lockDaysDisplay = calculateLockDaysDisplay(info.unlockTimestamp, currentBlockTimestamp);
        const rewardsDisplay = formatRewards(info.rewardAmount);

        return {
          stakeId: info.stakeId,
          tokenId: Number(info.tokenId),
          amount: info.amount,
          stakeTimestamp: info.stakeTimestamp,
          lockDuration: info.lockDuration,
          unlockTimestamp: info.unlockTimestamp,
          rewardAmount: info.rewardAmount,
          claimed: info.claimed,
          unstaked: info.unstaked,
          isUnlocked,
          lockDaysDisplay,
          rewardsDisplay,
        };
      });
  }, [stakeInfos, address, currentBlockTimestamp]);

  const totalRewards = useMemo(() => {
    return stakedPositions.reduce((sum, pos) => {
      if (pos.claimed) return sum;
      // Show all unclaimed rewards - contract decides eligibility
      if (pos.rewardAmount) {
        return sum + pos.rewardAmount;
      }
      return sum;
    }, BigInt(0));
  }, [stakedPositions]);

  const isLoading = isLoadingStakeIds || isLoadingStakeInfos;

  const handleStakeSuccess = () => {
    refetchStakeIds();
  };

  const handleUnstakeSuccess = () => {
    refetchStakeIds();
  };

  // Claim reward
  const { writeContract: writeClaim, data: claimTxHash, isPending: isClaimPending, error: claimWriteError } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  useEffect(() => {
    if (claimWriteError) {
      setClaimError(claimWriteError.message || String(claimWriteError));
    }
  }, [claimWriteError]);

  useEffect(() => {
    if (isClaimSuccess) {
      setClaimingStakeId(null);
      setClaimError(null);
      refetchStakeIds();
    }
  }, [isClaimSuccess, refetchStakeIds]);

  const handleClaim = (stakeId: bigint) => {
    if (!readEnabled || isClaimPending) return;
    setClaimError(null);
    setClaimingStakeId(stakeId);
    try {
      writeClaim({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "claim",
        args: [stakeId],
      } as any);
    } catch (error: any) {
      setClaimError(error?.message || String(error));
      setClaimingStakeId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Stake" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        {/* Action Buttons */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">Stake Your NFTs</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsStakeModalOpen(true)}
              className="w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg transition hover:opacity-90"
            >
              Stake NFT
            </button>
            <button
              type="button"
              onClick={() => setIsUnstakeModalOpen(true)}
              className="w-full bg-white/10 text-white font-bold py-3 rounded-lg border border-white/20 transition hover:bg-white/15"
            >
              Unstake NFT
            </button>
          </div>
        </section>

        {/* Master Reward Table */}
        <StakeTable />

        {/* My Staked NFTs Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">My Staked NFTs</h3>
            {readEnabled && !isLoading && totalRewards > BigInt(0) && (
              <div className="text-sm text-white/70">
                Total Rewards: <span className="font-semibold text-[#00d4c4]">
                  {formatRewards(totalRewards)} FRH
                </span>
              </div>
            )}
          </div>
          {!readEnabled && (
            <p className="text-sm text-white/70">Connect wallet to load staked NFTs.</p>
          )}
          {readEnabled && isLoading && (
            <p className="text-sm text-white/70">Loading staked NFTs...</p>
          )}
          {readEnabled && !isLoading && stakeInfosError && stakedPositions.length === 0 && (
            <p className="text-sm text-red-400">Failed to load your staked NFTs. Please try again in a moment.</p>
          )}
          {readEnabled && !isLoading && !stakeInfosError && stakedPositions.length === 0 && (
            <p className="text-sm text-white/70">
              You have no staked NFTs yet. Use the Stake NFT button above to get started.
            </p>
          )}
          {readEnabled && !isLoading && (() => {
            if (!stakedPositions || !Array.isArray(stakedPositions) || stakedPositions.length === 0) {
              return null;
            }
            
            return (
              <div className="space-y-3">
                {stakedPositions.map((position) => {
                  if (!position || position.tokenId === undefined) return null;
                  
                  const rewardAmount = position.rewardAmount;
                  // Let contract decide eligibility - only disable if already claimed or transaction pending
                  const isDisabled = position.claimed || isClaimPending || isClaimConfirming;

                  return (
                    <div
                      key={`${position.stakeId.toString()}-${position.stakeTimestamp.toString()}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {getNameFromTokenId(position.tokenId) ?? "FarFISH"} • Stake #{position.stakeId.toString()}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Quantity Staked: {Number(position.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Lock Duration: {Number(position.lockDuration) / (24 * 60 * 60)} days
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Reward: <span className="font-semibold text-[#00d4c4]">
                              {position.rewardsDisplay || "0"} FRH
                            </span>{" "}
                            {position.claimed ? "(claimed)" : ""}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Status: {position.unstaked ? "Unstaked" : position.isUnlocked ? "Unlockable" : "Locked"}
                          </p>
                        </div>
                      </div>
                      {claimError && claimingStakeId === position.stakeId && (
                        <p className="text-xs text-red-400">Claim failed: {claimError}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnstakePosition(position);
                            setIsUnstakeModalOpen(true);
                          }}
                          className="rounded-lg py-2 text-sm font-semibold transition bg-white/10 text-white hover:bg-white/15 border border-white/20"
                        >
                          Unstake
                        </button>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleClaim(position.stakeId)}
                          className={`rounded-lg py-2 text-sm font-semibold transition ${
                            !isDisabled
                              ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                              : "bg-white/10 text-white/40 cursor-not-allowed"
                          }`}
                        >
                          {claimingStakeId === position.stakeId && (isClaimPending || isClaimConfirming)
                            ? "Claiming..."
                            : position.claimed
                            ? "Claimed"
                            : "Claim Rewards"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      </div>

      {/* Modals */}
      <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setIsStakeModalOpen(false)}
        onSuccess={handleStakeSuccess}
      />
      <UnstakeModal
        isOpen={isUnstakeModalOpen}
        onClose={() => {
          setIsUnstakeModalOpen(false);
          setSelectedUnstakePosition(null);
        }}
        onSuccess={handleUnstakeSuccess}
        initialPosition={selectedUnstakePosition}
      />
    </div>
  );
}
