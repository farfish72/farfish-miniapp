"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { base } from "viem/chains";
import { wagmiConfig } from "../lib/wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";

const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () => {
  return process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
};

// Canonical stake model used across the entire app.
export interface UserStake {
  stakeId: bigint;
  rewardAmount: bigint;
  lockDuration: bigint;
  unlockTimestamp: bigint;
  claimed: boolean;
  unstaked: boolean;
}

export interface UseUserStakesResult {
  stakes: UserStake[];
  activeStakes: UserStake[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void> | void;
}

export default function useUserStakes(): UseUserStakesResult {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;

  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  const [stakes, setStakes] = useState<UserStake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Single source of truth for stakeIds.
  const {
    data: stakeIds,
    refetch: refetchStakeIds,
    isLoading: isLoadingStakeIds,
  } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getUserStakeIds",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: readEnabled,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  } as any);

  const loadStakes = useCallback(async () => {
    if (!readEnabled) {
      // Preserve last known good stakes; disabled reads should not clear state.
      return;
    }

    try {
      setIsError(false);

      if (!stakeIds) {
        // During initial mount / refetch stakeIds can be undefined; keep previous state.
        return;
      }

      if (Array.isArray(stakeIds) && stakeIds.length === 0) {
        // Explicit empty list from contract – user truly has no stakes.
        setStakes([]);
        return;
      }

      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      if (!publicClient) return;

      setIsLoading(true);

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

            // stakeId is the only lifecycle identifier; we do not infer from tokenId/ownership.
            return {
              stakeId,
              rewardAmount: BigInt(rewardAmount ?? 0),
              lockDuration: BigInt(lockDuration ?? 0),
              unlockTimestamp: BigInt(unlockTimestamp ?? 0),
              claimed: Boolean(claimed),
              unstaked: Boolean(unstaked),
            } as UserStake;
          } catch (err) {
            console.error("Failed to fetch stake info for id", stakeId, err);
            return null;
          }
        }),
      );

      // Keep only successfully decoded stakes. stakeId === 0 is preserved naturally here.
      setStakes(results.filter(Boolean) as UserStake[]);
    } catch (error) {
      console.error("Failed to load user stakes:", error);
      // Preserve last known good stakes; mark error separately.
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [readEnabled, stakeIds]);

  // Initial + reactive load
  useEffect(() => {
    loadStakes();
  }, [loadStakes]);

  // Global staking lifecycle sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      if (!readEnabled) return;
      refetchStakeIds();
      // After refetching stakeIds, loadStakes will run via dependency change.
    };

    window.addEventListener("farfish:staking-updated", handler);
    return () => {
      window.removeEventListener("farfish:staking-updated", handler);
    };
  }, [readEnabled, refetchStakeIds]);

  const activeStakes = useMemo(
    () => stakes.filter((stake) => !stake.unstaked),
    [stakes],
  );

  return {
    stakes,
    activeStakes,
    isLoading: isLoading || isLoadingStakeIds,
    isError,
    refetch: async () => {
      await refetchStakeIds();
      await loadStakes();
    },
  };
}


