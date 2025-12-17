// app/stake/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useBlockNumber } from "wagmi";
import { formatUnits } from "viem";
import StakeModal from "../components/StakeModal";
import UnstakeModal from "../components/UnstakeModal";
import StakeTable from "../components/StakeTable";
import useUserStakes from "../hooks/useUserStakes";
import { STAKING_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";

const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () => {
  return process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
};

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [selectedStakeIdForUnstake, setSelectedStakeIdForUnstake] = useState<bigint | null>(null);
  const [claimingStakeId, setClaimingStakeId] = useState<bigint | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Get current block timestamp for contract state comparison
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [currentBlockTimestamp, setCurrentBlockTimestamp] = useState<bigint | null>(null);

  // Fetch current block timestamp
  useEffect(() => {
    if (!publicClient || !blockNumber || !readEnabled) return;
    
    const fetchBlockTimestamp = async () => {
      try {
        const block = await publicClient.getBlock({ blockNumber });
        if (block && block.timestamp) {
          setCurrentBlockTimestamp(BigInt(block.timestamp));
        }
      } catch (error) {
        console.error("Error fetching block timestamp:", error);
      }
    };
    
    fetchBlockTimestamp();
  }, [publicClient, blockNumber, readEnabled]);

  // Canonical stake lifecycle data – single source of truth.
  const { stakes, activeStakes, isLoading: isLoadingStakes, isError: stakesError, refetch } = useUserStakes();

  // Format rewards using formatUnits (function with guards)
  const formatRewards = (rewards: bigint | undefined): string => {
    // Explicitly check bigint value - do NOT use truthy checks
    // Compare with BigInt(0) explicitly (not 0n for ES compatibility)
    if (rewards === undefined || rewards === null || rewards === BigInt(0)) {
      return "0";
    }
    
    // Only format if rewards > BigInt(0)
    if (rewards <= BigInt(0)) {
      return "0";
    }
    
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

  const totalRewards = useMemo(() => {
    return activeStakes.reduce((sum, pos) => {
      if (pos.claimed) return sum;
      // Show all unclaimed rewards - contract decides eligibility
      // Explicitly check bigint value - do NOT use truthy checks
      if (pos.rewardAmount && pos.rewardAmount > BigInt(0)) {
        return sum + pos.rewardAmount;
      }
      return sum;
    }, BigInt(0));
  }, [activeStakes]);

  const isLoading = isLoadingStakes;

  const handleStakeSuccess = () => {
    refetch();
  };

  const handleUnstakeSuccess = () => {
    refetch();
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
      // Refresh canonical staking state after a successful claim.
      refetch();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("farfish:staking-updated", {
            detail: { type: "claim", txHash: claimTxHash },
          }),
        );
      }
    }
  }, [isClaimSuccess, claimTxHash, refetch]);

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
            {readEnabled && !isLoading && stakesError && activeStakes.length === 0 && (
            <p className="text-sm text-red-400">Failed to load your staked NFTs. Please try again in a moment.</p>
          )}
          {readEnabled && !isLoading && !stakesError && activeStakes.length === 0 && (
            <p className="text-sm text-white/70">
              You have no staked NFTs yet. Use the Stake NFT button above to get started.
            </p>
          )}
          {readEnabled && !isLoading && (() => {
            if (!activeStakes || !Array.isArray(activeStakes) || activeStakes.length === 0) {
              return null;
            }
            
            return (
              <div className="space-y-3">
                {activeStakes.map((position) => {
                  if (!position) return null;

                  // CONTRACT STATE - Single source of truth
                  const lockDuration = position.lockDuration;
                  const unlockTimestamp = position.unlockTimestamp;
                  const rewardAmount = position.rewardAmount;
                  const claimed = position.claimed;
                  const unstaked = position.unstaked;

                  // LOCK STATUS - Compare unlockTimestamp with current block time
                  // If unlockTimestamp > current block time: LOCKED
                  // If unlockTimestamp <= current block time OR unlockTimestamp === 0: UNLOCKED
                  const isLocked = currentBlockTimestamp !== null && 
                    unlockTimestamp !== BigInt(0) && 
                    unlockTimestamp > currentBlockTimestamp;
                  
                  const lockStatus = isLocked ? "Locked" : "Unlocked";
                  
                  // UNLOCK TIMESTAMP DISPLAY
                  const unlockDateDisplay = unlockTimestamp > BigInt(0)
                    ? new Date(Number(unlockTimestamp) * 1000).toLocaleString()
                    : "N/A";

                  // LOCK DURATION DISPLAY
                  const lockDurationDisplay = lockDuration > BigInt(0)
                    ? `${Number(lockDuration) / 86400} days`
                    : "No lock";

                  // REWARD DISPLAY - Only show on-chain rewardAmount
                  const rewardDisplay = rewardAmount > BigInt(0)
                    ? formatRewards(rewardAmount)
                    : "0";

                  // CLAIM BUTTON STATE - Contract-driven logic
                  // Enable ONLY IF:
                  //   unlockTimestamp !== 0 AND
                  //   unlockTimestamp <= current block time AND
                  //   claimed === false AND
                  //   unstaked === false
                  const canClaim = currentBlockTimestamp !== null &&
                    unlockTimestamp !== BigInt(0) &&
                    unlockTimestamp <= currentBlockTimestamp &&
                    claimed === false &&
                    unstaked === false;

                  const isDisabled = !canClaim || isClaimPending || isClaimConfirming;
                  
                  // CLAIM BUTTON LABEL
                  let claimButtonLabel = "Claim";
                  if (claimingStakeId === position.stakeId && (isClaimPending || isClaimConfirming)) {
                    claimButtonLabel = "Claiming...";
                  } else if (claimed) {
                    claimButtonLabel = "Claimed";
                  } else if (isLocked) {
                    claimButtonLabel = "Locked";
                  } else if (unstaked) {
                    claimButtonLabel = "Unstaked";
                  } else if (unlockTimestamp === BigInt(0)) {
                    claimButtonLabel = "Not Available";
                  }

                  return (
                    <div
                      key={position.stakeId.toString()}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      {/* Info Section - Grouped Together */}
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-semibold">
                          Stake #{position.stakeId.toString()}
                        </p>
                        <p className="text-xs text-white/70">
                          Reward:{" "}
                          <span className="font-semibold text-[#00d4c4]">
                            {rewardDisplay} FRH
                          </span>
                        </p>
                        <p className="text-xs text-white/70">
                          Lock Duration: {lockDurationDisplay}
                        </p>
                        <p className="text-xs text-white/70">
                          Status: {lockStatus}
                        </p>
                        {isLocked && unlockTimestamp > BigInt(0) && (
                          <p className="text-xs text-white/70">
                            Unlocks at: {unlockDateDisplay}
                          </p>
                        )}
                        {claimError && claimingStakeId === position.stakeId && (
                          <p className="text-xs text-red-400 mt-2">Claim failed: {claimError}</p>
                        )}
                      </div>
                      
                      {/* Action Section - Visually Separated */}
                      <div className="pt-3 border-t border-white/10 flex justify-end">
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleClaim(position.stakeId)}
                          className={`rounded-lg py-2 px-4 text-sm font-semibold transition ${
                            !isDisabled
                              ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                              : "bg-white/10 text-white/40 cursor-not-allowed"
                          }`}
                        >
                          {claimButtonLabel}
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
