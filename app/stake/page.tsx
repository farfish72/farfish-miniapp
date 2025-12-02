// app/stake/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { useAccount } from "wagmi";
import { useContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { supabase } from "../lib/supabase";
import { MULTIPLIERS } from "../lib/multipliers";
import { tierById, powerById, STAKING_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS } from "../constants";
import stakeAbi from "../abi/stake.json";
import editionDropAbi from "../abi/editionDrop.json";
import { useFarcasterSigner } from "../contexts/FarcasterSignerContext";

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
  const { signer, isConnected: isSignerConnected } = useFarcasterSigner();
  const [nowTick, setNowTick] = useState(Date.now());
  const [staked, setStaked] = useState<StakedItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pendingAction, setPendingAction] = useState<"stake" | "unstake" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const walletAddress = user?.walletAddress;
  useFarcasterEnvironment("Stake page");
  const { contract: nftContract } = useContract(
    NFT_CONTRACT_ADDRESS || undefined,
    "edition-drop",
  );


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
    if (!isSignerConnected || !signer || !address || !STAKING_CONTRACT_ADDRESS || !walletAddress) {
      setToast({
        type: "error",
        message: "Please connect your Farcaster wallet first.",
      });
      return;
    }
    if (!selectedDuration) {
      setToast({
        type: "error",
        message: "Please select a staking period first.",
      });
      return;
    }

    const performStake = async () => {
      try {
        setPendingAction("stake");
        setToast(null);

        if (!NFT_CONTRACT_ADDRESS) {
          throw new Error("NFT contract address not configured");
        }

        // 1. Check approval using ethers contract with signer
        let isApproved = false;
        try {
          // Check isApprovedForAll using ERC1155 standard
          const erc1155Abi = [
            "function isApprovedForAll(address account, address operator) view returns (bool)",
            "function setApprovalForAll(address operator, bool approved)",
          ];
          const erc1155Contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, erc1155Abi, signer);
          isApproved = await erc1155Contract.isApprovedForAll(address, STAKING_CONTRACT_ADDRESS);
        } catch (error) {
          console.error("Failed to check NFT approval", error);
        }

        // 2. Request approval if needed - using Farcaster signer
        if (!isApproved) {
          try {
            const erc1155Abi = [
              "function setApprovalForAll(address operator, bool approved)",
            ];
            const erc1155Contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, erc1155Abi, signer);
            const approvalTx = await erc1155Contract.setApprovalForAll(
              STAKING_CONTRACT_ADDRESS,
              true,
            );
            const approvalReceipt = await approvalTx.wait();
            const approvalHash = approvalReceipt?.hash || approvalReceipt?.transactionHash;

            setToast({
              type: "success",
              message: approvalHash
                ? `Approval successful. Tx: ${approvalHash}`
                : "Approval successful.",
            });
          } catch (error: any) {
            console.error("Approval transaction failed", error);
            setPendingAction(null);
            setToast({
              type: "error",
              message: error?.reason || error?.message || "Approval failed",
            });
            return;
          }
        }

        // 3. Stake action on the staking contract using Farcaster signer
        const tokenId = 0;
        const durationDays = BigInt(selectedDuration);

        const stakingContractInstance = new ethers.Contract(
          STAKING_CONTRACT_ADDRESS,
          stakeAbi,
          signer,
        );

        let stakeTx;
        let stakeReceipt;
        let stakeHash;

        try {
          stakeTx = await stakingContractInstance.stake(tokenId, durationDays);
          stakeReceipt = await stakeTx.wait();
          stakeHash = stakeReceipt?.hash || stakeReceipt?.transactionHash;
        } catch (stakeError: any) {
          console.error("Stake transaction failed, attempting fallback transfer", stakeError);
          
          // Fallback: transfer NFT directly to staking contract
          if (!NFT_CONTRACT_ADDRESS) {
            throw new Error("NFT contract address not configured for fallback");
          }

          const erc1155TransferAbi = [
            "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
          ];
          const nftContractInstance = new ethers.Contract(
            NFT_CONTRACT_ADDRESS,
            erc1155TransferAbi,
            signer,
          );

          stakeTx = await nftContractInstance.safeTransferFrom(
            address,
            STAKING_CONTRACT_ADDRESS,
            tokenId,
            1,
            "0x",
          );
          stakeReceipt = await stakeTx.wait();
          stakeHash = stakeReceipt?.hash || stakeReceipt?.transactionHash;
        }

        // Call sync API if it exists
        try {
          await fetch("/api/staked/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: address,
              tokenId: Number(tokenId),
              tokenTier: 0, // Default tier, can be updated later
              lockDays: selectedDuration,
            }),
          });
        } catch (syncError) {
          console.error("Failed to sync staking position to backend", syncError);
          // Don't fail the whole flow if sync fails
        }

        setToast({
          type: "success",
          message: stakeHash
            ? `Staked successfully. Tx: ${stakeHash}`
            : "Staked successfully.",
        });

        // Re-fetch staked positions
        fetchStakedPositions();
      } catch (error: any) {
        console.error("Stake flow failed", error);
        setPendingAction(null);
        setToast({
          type: "error",
          message: error?.reason || error?.message || "Stake failed",
        });
      }
    };

    void performStake();
  }, [
    address,
    signer,
    isSignerConnected,
    selectedDuration,
    walletAddress,
    STAKING_CONTRACT_ADDRESS,
    NFT_CONTRACT_ADDRESS,
  ]);

  const handleUnstakeTx = useCallback(() => {
    if (!isSignerConnected || !signer || !address || !STAKING_CONTRACT_ADDRESS) {
      setToast({
        type: "error",
        message: "Please connect your Farcaster wallet first.",
      });
      return;
    }
    setPendingAction("unstake");

    const performUnstake = async () => {
      try {
        const stakingContractInstance = new ethers.Contract(
          STAKING_CONTRACT_ADDRESS,
          stakeAbi,
          signer,
        );

        // Try unstake with tokenId first, fallback to no args
        let unstakeTx;
        try {
          const tokenId = 0;
          unstakeTx = await stakingContractInstance.unstake(tokenId);
        } catch (error: any) {
          // Fallback: try unstake without tokenId
          unstakeTx = await stakingContractInstance.unstake();
        }

        const unstakeReceipt = await unstakeTx.wait();
        const unstakeHash = unstakeReceipt?.hash || unstakeReceipt?.transactionHash;

        // Note: Unstake sync would need a separate endpoint or manual sync
        // For now, we'll just re-fetch positions
        fetchStakedPositions();

        setToast({
          type: "success",
          message: unstakeHash
            ? `Unstaked successfully. Tx: ${unstakeHash}`
            : "Unstaked successfully.",
        });
      } catch (error: any) {
        console.error("Unstake flow failed", error);
        setPendingAction(null);
        setToast({
          type: "error",
          message: error?.reason || error?.message || "Unstake failed",
        });
      }
    };

    void performUnstake();
  }, [address, signer, isSignerConnected, STAKING_CONTRACT_ADDRESS]);

  // Transaction confirmation is handled in the handlers above
  // Re-sync positions after successful transactions
  useEffect(() => {
    if (pendingAction && toast?.type === "success") {
      fetchStakedPositions();
    }
  }, [toast, pendingAction, fetchStakedPositions]);

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

          {/* Choose a staking period section */}
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Choose a staking period</h3>
              <p className="text-sm text-white/70 mt-1">Select a lock duration to boost your rewards.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 30 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration(30)}
                className={`rounded-xl p-4 border text-left transition ${
                  selectedDuration === 30
                    ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold">30 Days</span>
                  {/* TODO: replace with server computed multiplier */}
                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 font-medium">
                    Multiplier ~ x{MULTIPLIERS[30]}
                  </span>
                </div>
                <p className="text-xs text-white/70">Short lock. Easy exit.</p>
              </button>

              {/* 90 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration(90)}
                className={`rounded-xl p-4 border text-left transition ${
                  selectedDuration === 90
                    ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold">90 Days</span>
                  {/* TODO: replace with server computed multiplier */}
                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 font-medium">
                    Multiplier ~ x{MULTIPLIERS[90]}
                  </span>
                </div>
                <p className="text-xs text-white/70">Popular choice.</p>
              </button>

              {/* 180 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration(180)}
                className={`rounded-xl p-4 border text-left transition ${
                  selectedDuration === 180
                    ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold">180 Days</span>
                  {/* TODO: replace with server computed multiplier */}
                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 font-medium">
                    Multiplier ~ x{MULTIPLIERS[180]}
                  </span>
                </div>
                <p className="text-xs text-white/70">Higher rewards.</p>
              </button>

              {/* 360 Days */}
              <button
                type="button"
                onClick={() => setSelectedDuration(360)}
                className={`rounded-xl p-4 border text-left transition ${
                  selectedDuration === 360
                    ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold">360 Days</span>
                  {/* TODO: replace with server computed multiplier */}
                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 font-medium">
                    Multiplier ~ x{MULTIPLIERS[360]}
                  </span>
                </div>
                <p className="text-xs text-white/70">Max multiplier.</p>
              </button>
            </div>

            {/* TODO: replace UI placeholders with server computed multipliers */}

            {/* CTA Button */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  // Find and trigger the existing "Stake via Farcaster" button
                  const buttons = Array.from(document.querySelectorAll("button"));
                  const stakeButton = buttons.find(
                    (btn) => btn.textContent?.trim() === "Stake via Farcaster" || btn.textContent?.trim() === "Staking..."
                  );
                  if (stakeButton && walletAddress && STAKING_CONTRACT_ADDRESS) {
                    stakeButton.click();
                  }
                }}
                disabled={!selectedDuration || !walletAddress || !STAKING_CONTRACT_ADDRESS}
                className={`w-full rounded-lg py-3 text-sm font-semibold transition ${
                  selectedDuration && walletAddress && STAKING_CONTRACT_ADDRESS
                    ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                    : "bg-white/10 text-white/50 cursor-not-allowed"
                }`}
              >
                {selectedDuration ? `Stake selected (${selectedDuration} days)` : "Select a staking period"}
              </button>
              {(!walletAddress || !STAKING_CONTRACT_ADDRESS) && (
                <p className="text-xs text-white/60 mt-2 text-center">Connect wallet to continue.</p>
              )}
            </div>
          </div>

          {!STAKING_CONTRACT_ADDRESS && (
            <div className="w-full mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-200">
              Staking disabled — contract address is not configured.
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleStakeTx}
              disabled={!isSignerConnected || !walletAddress || !STAKING_CONTRACT_ADDRESS || pendingAction === "stake"}
              className={`w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg ${
                !isSignerConnected || !walletAddress || !STAKING_CONTRACT_ADDRESS ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {pendingAction === "stake"
                ? "Processing..."
                : "Stake via Farcaster"}
            </button>
            <button
              onClick={handleUnstakeTx}
              disabled={!isSignerConnected || !walletAddress || !STAKING_CONTRACT_ADDRESS || pendingAction === "unstake"}
              className={`w-full bg-white/10 text-white font-bold py-3 rounded-lg border border-white/20 ${
                !isSignerConnected || !walletAddress || !STAKING_CONTRACT_ADDRESS ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {pendingAction === "unstake"
                ? "Processing..."
                : "Unstake via Farcaster"}
            </button>
          </div>

          <button
            onClick={fetchStakedPositions}
            disabled={syncing || !walletAddress}
            className={`w-full mt-4 bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg ${
              !walletAddress ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {syncing ? "Processing..." : "Sync staked NFTs"}
          </button>
          {!walletAddress && (
            <p className="text-xs text-red-300 mt-2">Connect your wallet to enable syncing.</p>
          )}
        </section>

        {toast && (
          <div
            className={`text-xs font-semibold rounded-lg border p-3 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                : "bg-red-500/10 border-red-500/20 text-red-200"
            }`}
          >
            {toast.message}
          </div>
        )}

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