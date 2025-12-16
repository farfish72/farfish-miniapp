"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { STAKING_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import stakeAbi from "../abi/stake.json";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import { base } from "viem/chains";

interface UnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPosition?: StakedPosition | null;
}

interface StakedPosition {
  stakeId: bigint;
  tokenId: number;
  amount: bigint;
  unlockTimestamp: bigint;
  rewardAmount: bigint;
  claimed: boolean;
  unstaked: boolean;
  isUnlocked: boolean;
}

const BASESCAN_URL = "https://basescan.org/tx";
const BASE_CHAIN_ID = 8453;

const getExpectedChainId = () => {
  return process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
};

export default function UnstakeModal({ isOpen, onClose, onSuccess, initialPosition }: UnstakeModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedPosition, setSelectedPosition] = useState<StakedPosition | null>(null);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [positions, setPositions] = useState<StakedPosition[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState(false);

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Get user's stake IDs
  const { data: stakeIds, refetch: refetchStakeIds } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getUserStakeIds",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: readEnabled },
  } as any);

  // Fetch stake info tuples for each stakeId
  useEffect(() => {
    const fetchStakeInfos = async () => {
      if (!readEnabled) {
        setPositions([]);
        return;
      }

      try {
        setPositionsError(false);

        if (!stakeIds || !Array.isArray(stakeIds) || stakeIds.length === 0) {
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
                staker,
                tokenId,
                amount,
                _stakeTimestamp,
                _lockDuration,
                unlockTimestamp,
                rewardAmount,
                claimed,
                unstaked,
              ] = data as any[];

              if (!staker || staker.toLowerCase() !== (address || "").toLowerCase()) {
                return null;
              }

              const isUnlocked = unlockTimestamp ? BigInt(unlockTimestamp) <= BigInt(Math.floor(Date.now() / 1000)) : false;

              return {
                stakeId,
                tokenId: Number(tokenId ?? 0),
                amount: BigInt(amount ?? 0),
                unlockTimestamp: BigInt(unlockTimestamp ?? 0),
                rewardAmount: BigInt(rewardAmount ?? 0),
                claimed: Boolean(claimed),
                unstaked: Boolean(unstaked),
                isUnlocked,
              } as StakedPosition;
            } catch (err) {
              console.error("Failed to fetch stake info for id", stakeId, err);
              return null;
            }
          })
        );

        // Filter out already unstaked positions - only show active stakes
        const activePositions = results.filter((pos): pos is StakedPosition =>
          Boolean(pos) && !pos.unstaked
        );
        setPositions(activePositions);
      } catch (error) {
        console.error("Failed to fetch stake infos for UnstakeModal:", error);
        // Preserve any previously loaded positions so we never misreport \"no positions\" on error.
        setPositionsError(true);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    fetchStakeInfos();
  }, [readEnabled, stakeIds, address]);

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isPending = isWritePending || isTxConfirming;
  // Let contract decide eligibility - don't block in UI
  const canWithdraw = selectedPosition && !selectedPosition.unstaked;

  // Set initial position when modal opens or initialPosition changes
  useEffect(() => {
    if (isOpen && initialPosition) {
      setSelectedPosition(initialPosition);
    }
  }, [isOpen, initialPosition]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPosition(null);
      setToast(null);
    }
  }, [isOpen]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      setToast({ type: "success", message: "NFT unstaked successfully!" });
      refetchStakeIds();
      setTimeout(() => {
        // Broadcast a global staking update so other views (Profile, Chest, Stake) can refetch getUserStakeIds.
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("farfish:staking-updated", {
              detail: { type: "unstake", txHash },
            }),
          );
        }

        onSuccess?.();
        onClose();
      }, 2000);
    }
  }, [isTxSuccess, txHash, refetchStakeIds, onSuccess, onClose]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorMsg = writeError.message || String(writeError);
      console.error("Unstake error:", writeError);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  }, [writeError]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleUnstake = () => {
    if (!canWithdraw || !address || !STAKING_CONTRACT_ADDRESS || !selectedPosition) return;

    // Precondition checks
    if (!isConnected) {
      setToast({ type: "error", message: "Please connect your wallet" });
      return;
    }

    if (!isBaseNetwork) {
      setToast({ type: "error", message: `Please switch to the correct network (chainId ${expectedChainId})` });
      return;
    }

    // Let contract decide eligibility - don't block in UI
    try {
      writeContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "unstake",
        args: [selectedPosition.stakeId],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error("Unstake error:", error);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050e18] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Unstake NFT</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {!isConnected && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">Please connect your wallet to unstake NFTs.</p>
          </div>
        )}

        {isConnected && !isBaseNetwork && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">Please switch to the correct network (chainId {expectedChainId}).</p>
          </div>
        )}

        {/* Position Selection */}
        {!isConnected ? (
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-white/70">Connect wallet to view positions.</p>
          </div>
        ) : isLoadingPositions ? (
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-white/70">Loading staked positions...</p>
          </div>
        ) : positionsError && positions.length === 0 ? (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-200">Failed to load your staked positions. Please try again.</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-white/70">You have no staked positions to unstake.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Staked Position</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {positions.map((position) => {
                  // Selection is by stakeId (lifecycle identifier), not tokenId.
                  const isSelected = selectedPosition?.stakeId === position.stakeId;
                  const name = getNameFromTokenId(position.tokenId) ?? "FarFISH";
                  return (
                    <button
                      key={position.stakeId.toString()}
                      type="button"
                      onClick={() => {
                        setSelectedPosition(position);
                      }}
                      disabled={isPending || position.unstaked}
                      className={`w-full rounded-xl p-3 border text-left transition ${
                        isSelected
                          ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      } ${isPending || position.unstaked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold block">
                            {name}
                          </span>
                          <span className="text-xs text-white/70">
                            Stake #{position.stakeId.toString()} • Quantity: {Number(position.amount)}
                          </span>
                        </div>
                        {position.unstaked ? (
                          <span className="text-xs text-white/60">Already unstaked</span>
                        ) : (
                          <span className="text-xs text-white/70">Stake #{position.stakeId.toString()}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Transaction Status */}
        {isPending && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200">
              {isTxConfirming ? "Confirming transaction..." : "Transaction pending..."}
            </p>
            {txHash && (
              <a
                href={`${BASESCAN_URL}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00d4c4] hover:underline mt-2 block"
              >
                View on BaseScan
              </a>
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`mb-4 p-3 rounded-lg border ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                : "bg-red-500/10 border-red-500/20 text-red-200"
            }`}
          >
            <p className="text-sm">{toast.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUnstake}
            disabled={!canWithdraw || isPending}
            className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${
              canWithdraw && !isPending
                ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            {isPending ? "Processing..." : "Unstake"}
          </button>
        </div>
      </div>
    </div>
  );
}

