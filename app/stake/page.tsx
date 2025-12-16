// app/stake/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { useAccount, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import { base } from "viem/chains";
import { formatUnits } from "viem";
import { STAKING_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";
import StakeModal from "../components/StakeModal";
import UnstakeModal from "../components/UnstakeModal";
import StakeTable from "../components/StakeTable";

const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () => {
  return process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
};

// Minimal stake model for UI built *only* from getStakeInfo(stakeId).
// We intentionally do NOT track tokenId, ownership, metadata, or any
// off-chain assumptions; the contract is the single source of truth.
interface StakePosition {
  stakeId: bigint;
  rewardAmount: bigint;
  lockDuration: bigint;
  unlockTimestamp: bigint;
  claimed: boolean;
  unstaked: boolean;
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [selectedStakeIdForUnstake, setSelectedStakeIdForUnstake] = useState<bigint | null>(null);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState(false);
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

  // Keep stake positions as "last known good" data and NEVER clear them on
  // transient disabled reads or undefined stakeIds. React/Wagmi hydration
  // races can briefly flip readEnabled/undefined stakeIds; if we eagerly wipe
  // state we would falsely render "no stake" even though on-chain state is
  // unchanged. The contract is the source of truth; UI just reflects it.
  // Fetch stake info tuples for each stakeId
  useEffect(() => {
    const fetchPositions = async () => {
      if (!readEnabled) {
        // Do NOT wipe positions here; readEnabled can flap during hydration or
        // short network glitches and we must preserve previously loaded stakes.
        return;
      }

      try {
        setPositionsError(false);

        if (!stakeIds) {
          // When stakeIds is temporarily undefined during initial mount or refetch,
          // keep existing positions to avoid a false "no staked NFTs" UI.
          return;
        }

        if (Array.isArray(stakeIds) && stakeIds.length === 0) {
          // getUserStakeIds is the single source of truth; an explicit empty
          // array means the user truly has no active stakes.
          setPositions([]);
          return;
        }

        const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
        if (!publicClient) return;

        setIsLoadingPositions(true);
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
                _staker,
                _tokenId,
                _amount,
                _stakeTimestamp,
                lockDuration,
                unlockTimestamp,
                rewardAmount,
                claimed,
                unstaked,
              ] = data as any[];

              return {
                stakeId,
                rewardAmount: BigInt(rewardAmount ?? 0),
                lockDuration: BigInt(lockDuration ?? 0),
                unlockTimestamp: BigInt(unlockTimestamp ?? 0),
                claimed: Boolean(claimed),
                unstaked: Boolean(unstaked),
              } as StakePosition;
            } catch (err) {
              console.error("Failed to fetch stake info for id", stakeId, err);
              return null;
            }
          })
        );

        // Preserve only successfully decoded positions; we never infer from tokenId
        // or ownership, we only reflect what getStakeInfo(stakeId) returns.
        setPositions(results.filter(Boolean) as StakePosition[]);
      } catch (error) {
        console.error("Failed to fetch stake infos:", error);
        // Preserve any previously loaded positions so the UI never lies with a false "no stake" state.
        setPositionsError(true);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    fetchPositions();
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

  // We only work with positions derived directly from getStakeInfo(stakeId)
  // and only use stakeId, rewardAmount, lockDuration, unlockTimestamp,
  // claimed, and unstaked. No tokenId, balances, or metadata.
  const activePositions: StakePosition[] = useMemo(() => {
    if (!positions.length) return [];
    return positions.filter((pos) => !pos.unstaked);
  }, [positions]);

  const totalRewards = useMemo(() => {
    return activePositions.reduce((sum, pos) => {
      if (pos.claimed) return sum;
      // Show all unclaimed rewards - contract decides eligibility
      if (pos.rewardAmount) {
        return sum + pos.rewardAmount;
      }
      return sum;
    }, BigInt(0));
  }, [activePositions]);

  const isLoading = isLoadingStakeIds || isLoadingPositions;

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
          {readEnabled && !isLoading && positionsError && activePositions.length === 0 && (
            <p className="text-sm text-red-400">Failed to load your staked NFTs. Please try again in a moment.</p>
          )}
          {readEnabled && !isLoading && !positionsError && activePositions.length === 0 && (
            <p className="text-sm text-white/70">
              You have no staked NFTs yet. Use the Stake NFT button above to get started.
            </p>
          )}
          {readEnabled && !isLoading && (() => {
            if (!activePositions || !Array.isArray(activePositions) || activePositions.length === 0) {
              return null;
            }
            
            return (
              <div className="space-y-3">
                {activePositions.map((position) => {
                  if (!position) return null;

                  // Let the contract decide eligibility; we only prevent duplicate
                  // clicks while a tx is in-flight or after a claim is marked claimed.
                  const isDisabled = position.claimed || isClaimPending || isClaimConfirming;
                  const lockDays =
                    position.lockDuration > BigInt(0)
                      ? Number(position.lockDuration) / 86400
                      : 0;
                  const unlockDate =
                    position.unlockTimestamp && position.unlockTimestamp > BigInt(0)
                      ? new Date(Number(position.unlockTimestamp) * 1000).toLocaleString()
                      : "—";

                  return (
                    <div
                      key={position.stakeId.toString()}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            Stake #{position.stakeId.toString()}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Reward:{" "}
                            <span className="font-semibold text-[#00d4c4]">
                              {formatRewards(position.rewardAmount)} FRH
                            </span>{" "}
                            {position.claimed ? "(claimed)" : ""}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Lock: {lockDays > 0 ? `${lockDays} days` : "—"}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Unlocks at: {unlockDate}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Status: {position.claimed ? "Claimed" : "Claimable"}
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
                            setSelectedStakeIdForUnstake(position.stakeId);
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
          setSelectedStakeIdForUnstake(null);
        }}
        onSuccess={handleUnstakeSuccess}
        initialStakeId={selectedStakeIdForUnstake}
      />
    </div>
  );
}
