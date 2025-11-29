// app/stake/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { supabase } from "../lib/supabase";
import { tierById, powerById, STAKING_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";

const DAY_MS = 1000 * 60 * 60 * 24;

type StakedItem = {
  id: string;
  name: string;
  image: string;
  lockDays: number;
  stakedAt: number;
  tierId?: number;
};

export default function StakingPage() {
  const { user } = useUser();
  const { address } = useAccount();
  const [nowTick, setNowTick] = useState(Date.now());
  const [staked, setStaked] = useState<StakedItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pendingAction, setPendingAction] = useState<"stake" | "unstake" | null>(null);
  const walletAddress = user?.walletAddress;
  useFarcasterEnvironment("Stake page");

  const {
    writeContract,
    data: stakeTxHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isTxConfirming,
    isSuccess: isTxConfirmed,
  } = useWaitForTransactionReceipt({
    hash: stakeTxHash,
  });

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const fetchStakedPositions = useCallback(async () => {
    if (!walletAddress) {
      setStaked([]);
      return;
    }
    setSyncing(true);
    try {
      const { data } = await supabase
        .from("staking_positions")
        .select("token_id, token_tier, lock_days, staked_at, image_url")
        .eq("wallet_address", walletAddress);
      const mapped: StakedItem[] = (data ?? []).map((row: any) => ({
        id: `nft-${row.token_id}`,
        name: `Fishing NFT #${row.token_id}`,
        image: row.image_url ?? "https://placehold.co/400x400/222/00ffff?text=Item",
        lockDays: Number(row.lock_days ?? 0),
        stakedAt: Number(row.staked_at ?? Date.now()),
        tierId: Number(row.token_tier ?? 0),
      }));
      setStaked(mapped);
    } catch (error) {
      console.error("Failed to sync staking positions", error);
      setStaked([]);
    } finally {
      setSyncing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStakedPositions();
  }, [fetchStakedPositions]);

  const handleStakeTx = useCallback(() => {
    if (!address || !STAKING_CONTRACT_ADDRESS) return;
    setPendingAction("stake");
    writeContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: stakeAbi as any,
      functionName: "stake",
      args: [],
    } as any);
  }, [address, writeContract]);

  const handleUnstakeTx = useCallback(() => {
    if (!address || !STAKING_CONTRACT_ADDRESS) return;
    setPendingAction("unstake");
    writeContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: stakeAbi as any,
      functionName: "unstake",
      args: [],
    } as any);
  }, [address, writeContract]);

  useEffect(() => {
    if (!isTxConfirmed || !pendingAction) return;
    // Re-sync positions after a successful stake/unstake.
    fetchStakedPositions();
    setPendingAction(null);
  }, [isTxConfirmed, pendingAction, fetchStakedPositions]);

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return "Unlocked";
    const totalMinutes = Math.ceil(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `Unlocks in: ${days}d ${hours}h`;
    if (hours > 0) return `Unlocks in: ${hours}h ${minutes}m`;
    return `Unlocks in: ${minutes}m`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Stake" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xl font-bold">Locked Staking</h2>
          <p className="text-sm text-white/70 mt-1">
            Stake and unstake your FarFISH NFTs using your connected Farcaster wallet. After each transaction,
            sync the dashboard below to pull the live Supabase snapshot.
          </p>

          {!STAKING_CONTRACT_ADDRESS && (
            <div className="w-full mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-200">
              Staking disabled — contract address is not configured.
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleStakeTx}
              disabled={!walletAddress || !STAKING_CONTRACT_ADDRESS || isWritePending || isTxConfirming}
              className={`w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg ${
                !walletAddress || !STAKING_CONTRACT_ADDRESS ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {pendingAction === "stake" && (isWritePending || isTxConfirming)
                ? "Staking..."
                : "Stake via Farcaster"}
            </button>
            <button
              onClick={handleUnstakeTx}
              disabled={!walletAddress || !STAKING_CONTRACT_ADDRESS || isWritePending || isTxConfirming}
              className={`w-full bg-white/10 text-white font-bold py-3 rounded-lg border border-white/20 ${
                !walletAddress || !STAKING_CONTRACT_ADDRESS ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {pendingAction === "unstake" && (isWritePending || isTxConfirming)
                ? "Unstaking..."
                : "Unstake via Farcaster"}
            </button>
          </div>
          {writeError && (
            <p className="text-xs text-red-300 mt-2">
              {writeError.message}
            </p>
          )}
          {isTxConfirmed && (
            <p className="text-xs text-green-300 mt-2">
              Staking transaction confirmed. Positions will update after sync.
            </p>
          )}

          <button
            onClick={fetchStakedPositions}
            disabled={syncing || !walletAddress}
            className={`w-full mt-4 bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg ${
              !walletAddress ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {syncing ? "Syncing…" : "Sync staked NFTs"}
          </button>
          {!walletAddress && (
            <p className="text-xs text-red-300 mt-2">Connect your wallet to enable syncing.</p>
          )}
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-lg">Your Staked NFTs</h3>
          {staked.length === 0 ? (
            <p className="text-sm text-white/70 mt-1">No NFTs are staked yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {staked.map((item) => {
                const unlockAt = item.stakedAt + item.lockDays * DAY_MS;
                const remainingMs = unlockAt - nowTick;
                const unlocked = remainingMs <= 0;
                return (
                  <div
                    key={`${item.id}-${item.stakedAt}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/10">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-white/60">{item.lockDays} Days Lock</p>
                        {typeof item.tierId === "number" && (
                          <p className="text-xs text-white/70">
                            Tier: {tierById(item.tierId)?.name ?? "Bluefin"} • Power: {powerById(item.tierId ?? 0)}
                          </p>
                        )}
                        <p className={`text-xs ${unlocked ? "text-green-400" : "text-white/70"}`}>
                          {unlocked ? "Unlocked" : formatRemaining(remainingMs)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() =>
                          unlocked &&
                          setStaked((prev) => prev.filter((s) => !(s.id === item.id && s.stakedAt === item.stakedAt)))
                        }
                        disabled={!unlocked}
                        className={`px-3 py-2 rounded-md text-sm font-semibold ${
                          unlocked
                            ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black"
                            : "bg-white/10 text-white/60 cursor-not-allowed"
                        }`}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-white/60 mt-2">Unstake is disabled until lock ends.</p>
        </section>
      </div>
    </div>
  );
}