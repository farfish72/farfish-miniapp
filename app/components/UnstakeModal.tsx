"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { STAKING_CONTRACT_ADDRESS, getNameFromTokenId } from "../constants";
import stakeAbi from "../abi/stake.json";

interface UnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPosition?: StakedPosition | null;
}

interface StakedPosition {
  tokenId: number;
  quantity: bigint;
  stakedAt: bigint;
  lockDays: bigint;
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
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const expectedChainId = getExpectedChainId();
  const isBaseNetwork = chainId === expectedChainId;
  const readEnabled = Boolean(isConnected && address && STAKING_CONTRACT_ADDRESS && isBaseNetwork);

  // Read stake info to get all staked tokens
  const { data: stakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
    abi: stakeAbi as any,
    functionName: "getStakeInfo",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: readEnabled },
  } as any);

  // Parse staked token IDs from getStakeInfo
  const stakedTokenIds = useMemo(() => {
    if (!stakeInfo || !Array.isArray(stakeInfo) || stakeInfo.length < 2) return [];
    
    const tokensStaked = stakeInfo[0] as bigint[];
    if (!tokensStaked) return [];
    
    // Limit to first 20 tokens to avoid too many queries
    return tokensStaked.slice(0, 20).map((tokenId) => Number(tokenId));
  }, [stakeInfo]);

  // Query tokens 0-19 unconditionally (hooks must be called in same order every render)
  // We'll filter results to only show staked tokens
  const query0 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(0), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(0) } } as any);
  const query1 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(1), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(1) } } as any);
  const query2 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(2), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(2) } } as any);
  const query3 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(3), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(3) } } as any);
  const query4 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(4), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(4) } } as any);
  const query5 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(5), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(5) } } as any);
  const query6 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(6), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(6) } } as any);
  const query7 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(7), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(7) } } as any);
  const query8 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(8), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(8) } } as any);
  const query9 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(9), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(9) } } as any);
  const query10 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(10), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(10) } } as any);
  const query11 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(11), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(11) } } as any);
  const query12 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(12), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(12) } } as any);
  const query13 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(13), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(13) } } as any);
  const query14 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(14), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(14) } } as any);
  const query15 = useReadContract({ address: STAKING_CONTRACT_ADDRESS as `0x${string}`, abi: stakeAbi as any, functionName: "getStakeInfoForToken", args: address ? [BigInt(15), address as `0x${string}`] : undefined, query: { enabled: readEnabled && stakedTokenIds.includes(15) } } as any);

  const allQueries = [
    { tokenId: 0, query: query0 }, { tokenId: 1, query: query1 }, { tokenId: 2, query: query2 }, { tokenId: 3, query: query3 },
    { tokenId: 4, query: query4 }, { tokenId: 5, query: query5 }, { tokenId: 6, query: query6 }, { tokenId: 7, query: query7 },
    { tokenId: 8, query: query8 }, { tokenId: 9, query: query9 }, { tokenId: 10, query: query10 }, { tokenId: 11, query: query11 },
    { tokenId: 12, query: query12 }, { tokenId: 13, query: query13 }, { tokenId: 14, query: query14 }, { tokenId: 15, query: query15 },
  ];

  // Combine positions with detailed info - only include tokens that are actually staked
  const positions: StakedPosition[] = useMemo(() => {
    const result: StakedPosition[] = [];
    
    allQueries.forEach(({ tokenId, query }) => {
      // Only process tokens that are in the staked list
      if (!stakedTokenIds.includes(tokenId)) return;
      if (!query.data) return;
      
      const data = query.data;
      const quantity = typeof data === "object" && "quantity" in data ? data.quantity : (Array.isArray(data) ? data[0] : BigInt(0));
      const stakedAt = typeof data === "object" && "stakedAt" in data ? data.stakedAt : (Array.isArray(data) ? data[1] : BigInt(0));
      const lockDays = typeof data === "object" && "lockDays" in data ? data.lockDays : (Array.isArray(data) ? data[2] : BigInt(0));
      
      if (quantity <= 0) return;
      
      const stakedAtMs = Number(stakedAt) * 1000; // Assuming timestamp is in seconds
      const lockDaysNum = Number(lockDays);
      const unlockMs = stakedAtMs + (lockDaysNum * 24 * 60 * 60 * 1000);
      const isUnlocked = Date.now() >= unlockMs;
      
      result.push({
        tokenId,
        quantity,
        stakedAt,
        lockDays,
        isUnlocked,
      });
    });
    
    return result;
  }, [allQueries, stakedTokenIds]);

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isPending = isWritePending || isTxConfirming;
  const canWithdraw = selectedPosition && withdrawAmount && Number(withdrawAmount) > 0 && selectedPosition.isUnlocked;

  // Set initial position when modal opens or initialPosition changes
  useEffect(() => {
    if (isOpen && initialPosition) {
      setSelectedPosition(initialPosition);
      setWithdrawAmount(Number(initialPosition.quantity).toString());
    }
  }, [isOpen, initialPosition]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPosition(null);
      setWithdrawAmount("");
      setToast(null);
    }
  }, [isOpen]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      setToast({ type: "success", message: "NFT unstaked successfully!" });
      refetchStakeInfo();
      allQueries.forEach(({ query }) => (query as any).refetch?.());
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }
  }, [isTxSuccess, txHash, refetchStakeInfo, allQueries, onSuccess, onClose]);

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

    const amountNum = Number(withdrawAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setToast({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    if (amountNum > Number(selectedPosition.quantity)) {
      setToast({ type: "error", message: "Amount exceeds staked quantity" });
      return;
    }

    if (!selectedPosition.isUnlocked) {
      setToast({ type: "error", message: "This position is still locked" });
      return;
    }

    try {
      writeContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "withdraw",
        args: [BigInt(selectedPosition.tokenId), BigInt(amountNum)],
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
                  const isSelected = selectedPosition?.tokenId === position.tokenId;
                  const name = getNameFromTokenId(position.tokenId) ?? "FarFISH";
                  return (
                    <button
                      key={position.tokenId}
                      type="button"
                      onClick={() => {
                        setSelectedPosition(position);
                        setWithdrawAmount(Number(position.quantity).toString());
                      }}
                      disabled={isPending || !position.isUnlocked}
                      className={`w-full rounded-xl p-3 border text-left transition ${
                        isSelected
                          ? "border-[#00d4c4] bg-[#00d4c4]/10 shadow-lg shadow-[#00d4c4]/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      } ${isPending || !position.isUnlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold block">
                            {name}
                          </span>
                          <span className="text-xs text-white/70">
                            Quantity: {Number(position.quantity)} • Lock: {Number(position.lockDays)} days
                          </span>
                        </div>
                        {position.isUnlocked ? (
                          <span className="text-xs text-green-400">✅ Unlocked</span>
                        ) : (
                          <span className="text-xs text-yellow-400">🔒 Locked</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Withdraw Amount */}
            {selectedPosition && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Withdraw Amount</label>
                <input
                  type="number"
                  min="1"
                  max={Number(selectedPosition.quantity)}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00d4c4] disabled:opacity-50"
                  placeholder={`Max: ${Number(selectedPosition.quantity)}`}
                />
                <p className="text-xs text-white/70 mt-1">
                  Available: {Number(selectedPosition.quantity)}
                </p>
              </div>
            )}
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

