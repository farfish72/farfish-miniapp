"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount, useChainId, useReadContract, usePublicClient } from "wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";

const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () =>
  process.env.NEXT_PUBLIC_CHAIN_ID
    ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
    : BASE_CHAIN_ID;

export type UserStake = {
  stakeId: bigint;
  rewardAmount: bigint;
  lockDuration: bigint;
  unlockTimestamp: bigint;
  claimed: boolean;
  unstaked: boolean;
};

export default function useUserStakes() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const expectedChainId = getExpectedChainId();
  const readEnabled =
    Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS) &&
    chainId === expectedChainId;

  const {
    data: stakeIds,
    isLoading: isLoadingIds,
    isError: isErrorIds,
    refetch: refetchStakeIds,
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

  const [stakes, setStakes] = useState<UserStake[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(false);
  const [isErrorStakes, setIsErrorStakes] = useState(false);

  useEffect(() => {
    if (!readEnabled || !publicClient) return;
    if (stakeIds === undefined) return;

    if (Array.isArray(stakeIds) && stakeIds.length === 0) {
      setStakes([]);
      setIsErrorStakes(false);
      return;
    }

    const loadStakes = async () => {
      try {
        setIsLoadingStakes(true);
        setIsErrorStakes(false);

        const results = await Promise.all(
          (stakeIds as bigint[]).map(async (stakeId) => {
            try {
              const data = await (publicClient as any).readContract({
                address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
                abi: stakeAbi as any,
                functionName: "getStakeInfo",
                args: [stakeId],
              });

              const info = data as any[];

              return {
                stakeId,
                rewardAmount: info[6] as bigint,
                lockDuration: info[4] as bigint,
                unlockTimestamp: info[5] as bigint,
                claimed: Boolean(info[7]),
                unstaked: Boolean(info[8]),
              } as UserStake;
            } catch {
              return null;
            }
          }),
        );

        setStakes(results.filter(Boolean) as UserStake[]);
      } catch {
        setIsErrorStakes(true);
      } finally {
        setIsLoadingStakes(false);
      }
    };

    loadStakes();
  }, [stakeIds, readEnabled, publicClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      refetchStakeIds();
    };

    window.addEventListener("farfish:staking-updated", handler);
    return () =>
      window.removeEventListener("farfish:staking-updated", handler);
  }, [refetchStakeIds]);

  const activeStakes = useMemo(
    () => stakes.filter((s) => !s.unstaked),
    [stakes],
  );

  return {
    stakes,
    activeStakes,
    isLoading: isLoadingIds || isLoadingStakes,
    isError: isErrorIds || isErrorStakes,
    refetch: refetchStakeIds,
  };
}
