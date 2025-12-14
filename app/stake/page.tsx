// app/stake/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { useAccount, useReadContract, useChainId } from "wagmi";
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

interface StakedPosition {
  tokenId: number;
  quantity: bigint;
  stakedAt: bigint;
  lockDays: bigint;
  isUnlocked: boolean;
  lockDaysDisplay: string; // Pre-calculated display string
  rewardsDisplay: string; // Pre-formatted rewards string
  lockEndTimestamp?: bigint;
  rewards?: bigint;
}

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false);
  const [selectedUnstakePosition, setSelectedUnstakePosition] = useState<StakedPosition | null>(null);

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Read stake info to get all staked tokens
  const { data: stakeInfo, refetch: refetchStakeInfo, isLoading: isLoadingStakeInfo } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfo",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: readEnabled, refetchInterval: 30000 },
  } as any);

  // Parse staked token IDs and total rewards from getStakeInfo
  const { stakedTokenIds, totalRewards } = useMemo(() => {
    if (!stakeInfo || !Array.isArray(stakeInfo) || stakeInfo.length < 3) {
      return { stakedTokenIds: [], totalRewards: BigInt(0) };
    }
    
    const tokensStaked = stakeInfo[0] as bigint[];
    const totalRewardsValue = stakeInfo[2] as bigint;
    
    if (!tokensStaked) {
      return { stakedTokenIds: [], totalRewards: totalRewardsValue || BigInt(0) };
    }
    
    return {
      stakedTokenIds: tokensStaked.map((tokenId) => Number(tokenId)),
      totalRewards: totalRewardsValue || BigInt(0),
    };
  }, [stakeInfo]);

  // Query tokens 0-15 unconditionally (hooks must be called in same order every render)
  // We'll filter results to only show staked tokens
  const query0 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(0), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(0), refetchInterval: 30000 } } as any);
  const query1 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(1), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(1), refetchInterval: 30000 } } as any);
  const query2 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(2), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(2), refetchInterval: 30000 } } as any);
  const query3 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(3), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(3), refetchInterval: 30000 } } as any);
  const query4 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(4), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(4), refetchInterval: 30000 } } as any);
  const query5 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(5), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(5), refetchInterval: 30000 } } as any);
  const query6 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(6), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(6), refetchInterval: 30000 } } as any);
  const query7 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(7), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(7), refetchInterval: 30000 } } as any);
  const query8 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(8), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(8), refetchInterval: 30000 } } as any);
  const query9 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(9), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(9), refetchInterval: 30000 } } as any);
  const query10 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(10), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(10), refetchInterval: 30000 } } as any);
  const query11 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(11), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(11), refetchInterval: 30000 } } as any);
  const query12 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(12), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(12), refetchInterval: 30000 } } as any);
  const query13 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(13), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(13), refetchInterval: 30000 } } as any);
  const query14 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(14), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(14), refetchInterval: 30000 } } as any);
  const query15 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(15), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(15), refetchInterval: 30000 } } as any);

  const allQueries = [
    { tokenId: 0, query: query0 }, { tokenId: 1, query: query1 }, { tokenId: 2, query: query2 }, { tokenId: 3, query: query3 },
    { tokenId: 4, query: query4 }, { tokenId: 5, query: query5 }, { tokenId: 6, query: query6 }, { tokenId: 7, query: query7 },
    { tokenId: 8, query: query8 }, { tokenId: 9, query: query9 }, { tokenId: 10, query: query10 }, { tokenId: 11, query: query11 },
    { tokenId: 12, query: query12 }, { tokenId: 13, query: query13 }, { tokenId: 14, query: query14 }, { tokenId: 15, query: query15 },
  ];

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
  const calculateLockDaysDisplay = (lockEnd: bigint | undefined, currentBlock: bigint | null): string => {
    // Guard: if no lockEnd or currentBlock, return "—"
    if (!lockEnd || !currentBlock) return "—";
    
    // Guard: if lockEnd <= currentBlock, return "Unlocked"
    if (lockEnd <= currentBlock) return "Unlocked";
    
    // Calculate: (lockEnd - currentBlock) / 86400
    try {
      const remainingSeconds = lockEnd - currentBlock;
      const days = Number(remainingSeconds) / 86400;
      
      // Guard: check for NaN or invalid
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
    const result: StakedPosition[] = [];
    
    // Guard: return empty if no block timestamp
    if (!currentBlockTimestamp) {
      return result;
    }
    
    allQueries.forEach(({ tokenId, query }) => {
      // Only process tokens that are in the staked list
      if (!stakedTokenIds.includes(tokenId)) return;
      if (!query.data) return;
      
      const data = query.data;
      // getStakeInfoForToken returns: [_tokensStaked, _rewards]
      // But code expects: [quantity, stakedAt, lockDays] - assuming contract returns more or wrapper exists
      const quantity = typeof data === "object" && "quantity" in data ? data.quantity : (Array.isArray(data) ? data[0] : BigInt(0));
      const stakedAt = typeof data === "object" && "stakedAt" in data ? data.stakedAt : (Array.isArray(data) ? data[1] : BigInt(0));
      const lockDays = typeof data === "object" && "lockDays" in data ? data.lockDays : (Array.isArray(data) ? data[2] : BigInt(0));
      // Try to get rewards - might be in a different index or property
      const rewards = typeof data === "object" && "rewards" in data ? data.rewards : (Array.isArray(data) && data.length > 3 ? data[3] : BigInt(0));
      
      // Guard: skip if quantity is zero or invalid
      if (!quantity || quantity <= BigInt(0)) return;
      
      // Guard: validate stakedAt and lockDays
      if (!stakedAt || !lockDays) return;
      
      // Calculate lock end timestamp (stakedAt + lockDays in seconds)
      let lockEndTimestamp: bigint;
      try {
        lockEndTimestamp = stakedAt + (lockDays * BigInt(86400));
      } catch (error) {
        console.error("Error calculating lockEndTimestamp:", error);
        return;
      }
      
      // Guard: validate lockEndTimestamp
      if (!lockEndTimestamp) return;
      
      const isUnlocked = lockEndTimestamp <= currentBlockTimestamp;
      
      // Calculate lock days display (with guards)
      const lockDaysDisplay = calculateLockDaysDisplay(lockEndTimestamp, currentBlockTimestamp);
      
      // Format rewards (with guards)
      const rewardsDisplay = formatRewards(rewards);
      
      result.push({
        tokenId,
        quantity,
        stakedAt,
        lockDays,
        isUnlocked,
        lockDaysDisplay,
        rewardsDisplay,
        lockEndTimestamp,
        rewards,
      });
    });
    
    return result;
  }, [allQueries, stakedTokenIds, currentBlockTimestamp]);

  const isLoading = isLoadingStakeInfo || allQueries.some(({ query }) => query.isLoading);

  const handleStakeSuccess = () => {
    refetchStakeInfo();
    allQueries.forEach(({ query }) => (query as any).refetch?.());
  };

  const handleUnstakeSuccess = () => {
    refetchStakeInfo();
    allQueries.forEach(({ query }) => (query as any).refetch?.());
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
          {readEnabled && !isLoading && stakedPositions.length === 0 && (
            <p className="text-sm text-white/70">You have no staked NFTs yet. Use the Stake NFT button above to get started.</p>
          )}
          {readEnabled && !isLoading && (() => {
            // Render guard: check if positions is valid array
            if (!stakedPositions || !Array.isArray(stakedPositions) || stakedPositions.length === 0) {
              return null;
            }
            
            return (
              <div className="space-y-3">
                {stakedPositions.map((position) => {
                  // Guard: validate position data
                  if (!position || position.tokenId === undefined) return null;
                  
                  // Guard: validate lockEndTimestamp
                  const lockEnd = position.lockEndTimestamp;
                  const rewardAmount = position.rewards;
                  
                  return (
                    <div
                      key={`${position.tokenId}-${position.stakedAt}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {getNameFromTokenId(position.tokenId) ?? "FarFISH"}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Quantity Staked: {(() => {
                              try {
                                return Number(position.quantity).toLocaleString();
                              } catch {
                                return "0";
                              }
                            })()}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Lock Duration: {position.lockDaysDisplay || "—"}
                          </p>
                          {rewardAmount !== undefined && rewardAmount > BigInt(0) && (
                            <p className="text-xs text-white/70 mt-1">
                              Rewards: <span className="font-semibold text-[#00d4c4]">
                                {position.rewardsDisplay || "0"} FRH
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUnstakePosition(position);
                          setIsUnstakeModalOpen(true);
                        }}
                        className="mt-2 w-full rounded-lg py-2 text-sm font-semibold transition bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                      >
                        Unstake
                      </button>
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
