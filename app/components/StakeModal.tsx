"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from "wagmi";
import { STAKING_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import stakeAbi from "../abi/stake.json";
import nftDropAbi from "../abi/nftDrop.json";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LOCK_DURATIONS = [30, 90, 180, 360] as const;
type LockDuration = typeof LOCK_DURATIONS[number];

// Only show 4 names: Bluefin, GoldRay, RedSpike, ShadowGill
// Token IDs: Bluefin (0-6), GoldRay (7-11), RedSpike (12-14), ShadowGill (15)
// We use representative token IDs for each rarity
const TOKEN_IDS = [0, 7, 12, 15]; // Representative tokenIds for each rarity

const BASESCAN_URL = "https://basescan.org/tx";
const BASE_CHAIN_ID = 8453;

export default function StakeModal({ isOpen, onClose, onSuccess }: StakeModalProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<LockDuration>(30);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [needsApproval, setNeedsApproval] = useState<boolean | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [stakeTxHash, setStakeTxHash] = useState<`0x${string}` | null>(null);

  const expectedChainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : BASE_CHAIN_ID;
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && NFT_CONTRACT_ADDRESS && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Check if user has approved the staking contract
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    abi: nftDropAbi as any,
    functionName: "isApprovedForAll",
    args: address && STAKING_CONTRACT_ADDRESS ? [address as `0x${string}`, STAKING_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: readEnabled },
  } as any);

  const { writeContract: writeApproval, data: approvalTx, isPending: isApprovalPending, error: approvalError } = useWriteContract();
  const { writeContract: writeStake, data: stakeTx, isPending: isStakePending, error: stakeError } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalTx,
  });

  // Wait for stake transaction
  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeTx,
  });

  const isPending = isApprovalPending || isApprovalConfirming || isStakePending || isStakeConfirming;
  const currentTxHash = approvalTx || stakeTx;

  const canStake = isConnected && isBaseNetwork && selectedTokenId !== null && selectedDuration;

  // Update needsApproval when approval status changes
  useEffect(() => {
    if (isApproved !== undefined) {
      setNeedsApproval(!isApproved);
    }
  }, [isApproved]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTokenId(null);
      setSelectedDuration(30);
      setToast(null);
      setNeedsApproval(null);
      setApprovalTxHash(null);
      setStakeTxHash(null);
    }
  }, [isOpen]);

  // Refetch approval status when modal opens
  useEffect(() => {
    if (isOpen && readEnabled) {
      refetchApproval();
    }
  }, [isOpen, readEnabled, refetchApproval]);

  const proceedWithStake = useCallback(() => {
    if (!address || !STAKING_CONTRACT_ADDRESS || selectedTokenId === null || !selectedDuration) return;

    const lockDurationSeconds = BigInt(selectedDuration * 24 * 60 * 60);

    try {
      writeStake({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "stake",
        args: [BigInt(selectedTokenId), lockDurationSeconds],
      } as any);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error("Stake error:", error);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  }, [address, STAKING_CONTRACT_ADDRESS, selectedTokenId, selectedDuration, writeStake]);

  // Handle approval transaction success
  useEffect(() => {
    if (isApprovalSuccess && approvalTx) {
      setApprovalTxHash(approvalTx);
      setToast({ type: "success", message: "Approval confirmed! Proceeding to stake..." });
      refetchApproval();
      // After approval, automatically proceed to stake
      setTimeout(() => {
        proceedWithStake();
      }, 1000);
    }
  }, [isApprovalSuccess, approvalTx, refetchApproval, proceedWithStake]);

  // Handle stake transaction success
  useEffect(() => {
    if (isStakeSuccess && stakeTx) {
      setStakeTxHash(stakeTx);
      setToast({ type: "success", message: "NFT staked successfully!" });
      // Reset all pending states immediately
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }
  }, [isStakeSuccess, stakeTx, onSuccess, onClose]);

  // Reset pending states when modal closes to prevent stuck loading
  useEffect(() => {
    if (!isOpen) {
      // Force reset by clearing any pending transaction states
      // The wagmi hooks will handle the actual state, but we ensure modal is clean
    }
  }, [isOpen]);

  // Handle approval errors
  useEffect(() => {
    if (approvalError) {
      const errorMsg = approvalError.message || String(approvalError);
      console.error("Approval error:", approvalError);
      setToast({ type: "error", message: `Approval failed: ${errorMsg}` });
    }
  }, [approvalError]);

  // Handle stake errors
  useEffect(() => {
    if (stakeError) {
      const errorMsg = stakeError.message || String(stakeError);
      console.error("Stake error:", stakeError);
      if (errorMsg.includes("mint") || errorMsg.includes("Mint") || errorMsg.includes("revert")) {
        setToast({ type: "error", message: "Rewards temporarily unavailable — contact support." });
      } else {
        setToast({ type: "error", message: `Transaction failed: ${errorMsg}` });
      }
    }
  }, [stakeError]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleStake = () => {
    if (!canStake || !address || !STAKING_CONTRACT_ADDRESS || !NFT_CONTRACT_ADDRESS || selectedTokenId === null || !selectedDuration) return;

    // Precondition checks
    if (!isConnected) {
      setToast({ type: "error", message: "Please connect your wallet" });
      return;
    }

    if (!isBaseNetwork) {
      setToast({ type: "error", message: `Please switch to the correct network (chainId ${expectedChainId})` });
      return;
    }

    // Check if approval is needed
    if (needsApproval === true) {
      // Request approval from user wallet
      try {
        writeApproval({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: nftDropAbi as any,
          functionName: "setApprovalForAll",
          args: [STAKING_CONTRACT_ADDRESS as `0x${string}`, true],
        } as any);
        setToast({ type: "success", message: "Please approve the transaction in your wallet..." });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error("Approval error:", error);
        setToast({ type: "error", message: `Approval failed: ${errorMsg}` });
      }
    } else if (needsApproval === false) {
      // Already approved, proceed with staking
      proceedWithStake();
    } else {
      // Approval status not yet loaded, wait a moment and retry
      setTimeout(() => {
        refetchApproval();
        if (isApproved) {
          proceedWithStake();
        } else {
          setToast({ type: "error", message: "Please wait for approval status to load..." });
        }
      }, 500);
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
          <h2 className="text-xl font-semibold">Stake NFT</h2>
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
            <p className="text-sm text-yellow-200">Please connect your wallet to stake NFTs.</p>
          </div>
        )}

        {isConnected && !isBaseNetwork && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">Please switch to the correct network (chainId {expectedChainId}).</p>
          </div>
        )}

        {/* Token Selection - Show only 4 names: Bluefin, GoldRay, RedSpike, ShadowGill */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select NFT</label>
          <div className="grid grid-cols-2 gap-2">
            {TOKEN_IDS.map((tokenId) => {
              const name = getNameFromTokenId(tokenId);
              if (!name) return null;
              return (
                <button
                  key={tokenId}
                  type="button"
                  onClick={() => setSelectedTokenId(tokenId)}
                  disabled={isPending}
                  className={`rounded-xl p-3 border text-left transition ${
                    selectedTokenId === tokenId
                      ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="text-sm font-semibold block">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lock Duration Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Lock Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {LOCK_DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setSelectedDuration(duration)}
                disabled={isPending}
                className={`rounded-xl p-3 border text-center transition ${
                  selectedDuration === duration
                    ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-sm font-semibold">{duration}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Approval Status */}
        {needsApproval === true && !isApprovalSuccess && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">
              Approval required: Please approve the staking contract to transfer your NFTs.
            </p>
          </div>
        )}

        {/* Transaction Status */}
        {isPending && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200">
              {isApprovalPending || isApprovalConfirming
                ? isApprovalConfirming
                  ? "Confirming approval..."
                  : "Approval transaction pending..."
                : isStakeConfirming
                ? "Confirming stake..."
                : "Stake transaction pending..."}
            </p>
            {currentTxHash && (
              <a
                href={`${BASESCAN_URL}/${currentTxHash}`}
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
            onClick={handleStake}
            disabled={!canStake || isPending || needsApproval === null}
            className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${
              canStake && !isPending && needsApproval !== null
                ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:opacity-90"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            {isPending
              ? isApprovalPending || isApprovalConfirming
                ? "Approving..."
                : "Staking..."
              : needsApproval === true
              ? "Approve & Stake"
              : needsApproval === null
              ? "Loading..."
              : "Stake"}
          </button>
        </div>
      </div>
    </div>
  );
}
