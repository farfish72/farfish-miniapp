/**
 * DropERC1155 Mint Flow on Base (chainId 8453)
 * 
 * One-per-wallet rule enforced by checking balanceOf(address, id) for all tokenIds 0-15.
 * Mint price read from NEXT_PUBLIC_MINT_PRICE_WEI environment variable.
 * Random tokenId selection weighted by remaining supply (maxTotalSupply - totalSupply).
 */
"use client";

import Image from "next/image";
import Header from "./components/Header";
import useFarcasterGate from "./hooks/useFarcasterGate";
import useFarcasterEnvironment from "./hooks/useFarcasterEnvironment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "./lib/wagmi";
import { NFT_CONTRACT_ADDRESS, getNameFromTokenId } from "./constants";
import nftDropAbi from "./abi/nftDrop.json";
import { detectFarcasterEnvironment } from "./utils/farcaster";
import { REFERRAL_APP_URL } from "./config/referral";

interface SupplyInfo {
  id: number;
  totalSupply: bigint;
  maxTotalSupply: bigint;
  remaining: bigint;
}

/**
 * Weighted random selection using browser crypto API.
 * Returns the selected tokenId from candidates based on remaining supply weights.
 */
function pickWeightedTokenId(candidates: SupplyInfo[]): number {
  if (candidates.length === 0) {
    throw new Error("No candidates available");
  }

  // Calculate total weight (sum of all remaining supplies)
  const totalWeight = candidates.reduce((sum, item) => sum + item.remaining, BigInt(0));

  if (totalWeight === BigInt(0)) {
    throw new Error("All tokens are sold out");
  }

  // Generate random number using crypto API
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomValue = randomArray[0];

  // Convert to BigInt and scale to [0, totalWeight)
  // Use modulo to map random value into the weight range
  const randomBigInt = BigInt(randomValue);
  const scaledRandom = randomBigInt % totalWeight;

  // Walk through candidates to find the selected one
  let accumulated = BigInt(0);
  for (const candidate of candidates) {
    accumulated += candidate.remaining;
    if (scaledRandom < accumulated) {
      return candidate.id;
    }
  }

  // Fallback to last candidate (should not happen)
  return candidates[candidates.length - 1].id;
}

const TOKEN_IDS = Array.from({ length: 16 }, (_, i) => i); // 0-15

export default function HomeClient() {
  const { blocked, message } = useFarcasterGate();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  // State
  const [supplyInfo, setSupplyInfo] = useState<SupplyInfo[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintedTokenId, setLastMintedTokenId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [mintedTokenUri, setMintedTokenUri] = useState<string | null>(null);

  const {
    writeContract: writeMint,
    data: mintTxHash,
    isPending: isMintPending,
    error: mintError,
  } = useWriteContract();
  const {
    isLoading: isMintConfirming,
    isSuccess: isMintConfirmed,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });

  const isFarcasterEnv = useFarcasterEnvironment("Home page");

  // Get mint price from environment variable
  const mintPriceWei = useMemo(() => {
    if (typeof window === "undefined") return null;
    const priceStr = process.env.NEXT_PUBLIC_MINT_PRICE_WEI;
    if (!priceStr) return null;
    try {
      return BigInt(priceStr);
    } catch {
      return null;
    }
  }, []);

  // Fetch supply info for all tokenIds (0-15)
  const fetchSupplyInfo = useCallback(async () => {
    if (typeof window === "undefined" || !NFT_CONTRACT_ADDRESS) return;

    setLoadingSupplies(true);
    setErrorMessage(null);

    try {
      const publicClient = getPublicClient(wagmiConfig);
      if (!publicClient) {
        setErrorMessage("Public client not available");
        return;
      }

      const supplyPromises = TOKEN_IDS.map(async (id) => {
        const [totalSupply, maxTotalSupply] = await Promise.all([
          (publicClient.readContract as any)({
            address: NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: nftDropAbi as any,
            functionName: "totalSupply",
            args: [BigInt(id)],
          }) as Promise<bigint>,
          (publicClient.readContract as any)({
            address: NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: nftDropAbi as any,
            functionName: "maxTotalSupply",
            args: [BigInt(id)],
          }) as Promise<bigint>,
        ]);

        const remaining = maxTotalSupply > totalSupply ? maxTotalSupply - totalSupply : BigInt(0);

        return {
          id,
          totalSupply,
          maxTotalSupply,
          remaining,
        } as SupplyInfo;
      });

      const supplies = await Promise.all(supplyPromises);
      setSupplyInfo(supplies);
    } catch (error) {
      console.error("Failed to fetch supply info:", error);
      setErrorMessage("Failed to load supply data");
    } finally {
      setLoadingSupplies(false);
    }
  }, []);

  // Check if wallet has already minted (balanceOf > 0 for any tokenId)
  const checkHasMinted = useCallback(async () => {
    if (typeof window === "undefined" || !address || !NFT_CONTRACT_ADDRESS) {
      setHasMinted(false);
      return;
    }

    try {
      const publicClient = getPublicClient(wagmiConfig);
      if (!publicClient) {
        return;
      }

      const balancePromises = TOKEN_IDS.map((id) =>
        (publicClient.readContract as any)({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: nftDropAbi as any,
          functionName: "balanceOf",
          args: [address as `0x${string}`, BigInt(id)],
        }) as Promise<bigint>
      );

      const balances = await Promise.all(balancePromises);
      const hasAnyBalance = balances.some((balance) => balance > BigInt(0));
      setHasMinted(hasAnyBalance);

      // If user has minted, find which tokenId and fetch its URI
      if (hasAnyBalance) {
        const mintedId = balances.findIndex((balance) => balance > BigInt(0));
        if (mintedId >= 0) {
          setLastMintedTokenId(mintedId);
          try {
            const uri = (await (publicClient.readContract as any)({
              address: NFT_CONTRACT_ADDRESS as `0x${string}`,
              abi: nftDropAbi as any,
              functionName: "uri",
              args: [BigInt(mintedId)],
            })) as string;
            if (uri) {
              setMintedTokenUri(uri);
            }
          } catch {
            // URI fetch failed, continue without it
          }
        }
      }
    } catch (error) {
      console.error("Failed to check mint status:", error);
    }
  }, [address]);

  // Fetch supply info on mount and when contract address changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchSupplyInfo();
    }
  }, [fetchSupplyInfo]);

  // Check mint status when wallet connects or address changes
  useEffect(() => {
    if (typeof window !== "undefined" && isConnected && address) {
      checkHasMinted();
    } else {
      setHasMinted(false);
      setLastMintedTokenId(null);
      setMintedTokenUri(null);
    }
  }, [isConnected, address, checkHasMinted]);

  // Refetch after successful mint
  useEffect(() => {
    if (isMintConfirmed && mintTxHash) {
      fetchSupplyInfo();
      checkHasMinted();
      setIsMinting(false);
      setToast({ type: "success", message: "Mint successful!" });
    }
  }, [isMintConfirmed, mintTxHash, fetchSupplyInfo, checkHasMinted]);

  // Handle mint errors
  useEffect(() => {
    if (mintError) {
      setIsMinting(false);
      const errorMsg = mintError.message || "Mint failed";
      if (errorMsg.includes("reject") || errorMsg.includes("denied") || errorMsg.includes("User rejected")) {
        setToast({ type: "error", message: "Transaction rejected" });
      } else {
        setErrorMessage(`Mint failed: ${errorMsg}`);
        setToast({ type: "error", message: `Mint failed: ${errorMsg}` });
      }
    }
  }, [mintError]);

  const handleConnect = useCallback(() => {
    const connector = connectors[0];
    if (!connector) return;
    connect({ connector });
  }, [connect, connectors]);

  const handleMint = useCallback(() => {
    setToast(null);
    setErrorMessage(null);

    if (!NFT_CONTRACT_ADDRESS) {
      setToast({ type: "error", message: "Contract missing — mint disabled" });
      return;
    }

    if (!address || !isConnected) {
      handleConnect();
      return;
    }

    if (hasMinted) {
      setToast({ type: "error", message: "You have already minted" });
      return;
    }

    if (!mintPriceWei) {
      setToast({ type: "error", message: "Mint price not configured" });
      return;
    }

    // Build candidates with remaining supply > 0
    const candidates = supplyInfo.filter((info) => info.remaining > BigInt(0));

    if (candidates.length === 0) {
      setToast({ type: "error", message: "All tokens are sold out" });
      return;
    }

    try {
      // Select random tokenId weighted by remaining supply
      const tokenId = pickWeightedTokenId(candidates);

      setIsMinting(true);

      writeMint({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: nftDropAbi as any,
        functionName: "claim",
        args: [address as `0x${string}`, BigInt(tokenId), BigInt(1)],
        value: mintPriceWei,
      } as any);
    } catch (error) {
      console.error("Mint transaction failed to start", error);
      setIsMinting(false);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to start mint transaction" });
    }
  }, [address, isConnected, hasMinted, supplyInfo, mintPriceWei, writeMint, handleConnect]);

  const handleShare = useCallback(() => {
    const isInFarcaster = isFarcasterEnv || detectFarcasterEnvironment();

    if (typeof window === "undefined") return;

    // Generate referral link with refCode
    let shareUrl = REFERRAL_APP_URL;
    if (address) {
      const refCode = address.slice(-6).toLowerCase();
      shareUrl = `${REFERRAL_APP_URL}?ref=${refCode}`;
    }

    const castText = `I just mint FarFISH limited edition NFT. Join the wave...\n${shareUrl}`;

    if (isInFarcaster) {
      try {
        window.parent?.postMessage(
          {
            type: "createCast",
            data: {
              cast: {
                text: castText,
              },
            },
          },
          "*",
        );
        setToast({ type: "success", message: "Composer opened" });
        return;
      } catch (error) {
        console.error("Failed to open native composer", error);
      }
    }

    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}`;
    window.open(warpcastUrl, "_blank", "noopener,noreferrer");
    setToast({ type: "success", message: "Composer opened" });
  }, [isFarcasterEnv, address]);

  // Calculate total minted and remaining across all tokenIds
  const totalMinted = useMemo(() => {
    return supplyInfo.reduce((sum, info) => sum + Number(info.totalSupply), 0);
  }, [supplyInfo]);

  const totalMaxSupply = useMemo(() => {
    return supplyInfo.reduce((sum, info) => sum + Number(info.maxTotalSupply), 0);
  }, [supplyInfo]);

  const totalRemaining = useMemo(() => {
    return Math.max(0, totalMaxSupply - totalMinted);
  }, [totalMinted, totalMaxSupply]);

  const mintedProgress = useMemo(() => {
    if (totalMaxSupply === 0) return 0;
    return Math.min(100, Math.max(0, (totalMinted / totalMaxSupply) * 100));
  }, [totalMinted, totalMaxSupply]);

  // Button states and labels
  const primaryButtonLabel = useMemo(() => {
    if (!NFT_CONTRACT_ADDRESS) return "Mint disabled";
    if (!address || !isConnected) return "Connect Farcaster";
    if (hasMinted) return "Already minted";
    if (isMinting || isMintPending || isMintConfirming) return "Minting…";
    if (mintPriceWei) {
      const priceEth = Number(mintPriceWei) / 1e18;
      return `Mint (${priceEth.toFixed(4)} ETH)`;
    }
    return "Mint";
  }, [address, isConnected, hasMinted, isMinting, isMintPending, isMintConfirming, mintPriceWei]);

  const primaryButtonClasses = useMemo(() => {
    if (!NFT_CONTRACT_ADDRESS) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/10 text-white/50 cursor-not-allowed";
    }
    if (!address || !isConnected) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/15 text-white hover:bg-white/25 transition";
    }
    if (hasMinted) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/10 text-white/50 cursor-not-allowed";
    }
    return "w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black transition disabled:opacity-60";
  }, [address, isConnected, hasMinted]);

  const primaryButtonDisabled =
    isConnecting ||
    isMinting ||
    isMintPending ||
    isMintConfirming ||
    !NFT_CONTRACT_ADDRESS ||
    hasMinted ||
    loadingSupplies;

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const GALLERY_IMAGES = useMemo(
    () => ["/fish1.jpg", "/fish2.jpg", "/fish3.jpg", "/fish4.jpg"],
    [],
  );

  const lastMintedDisplay = useMemo(() => {
    if (lastMintedTokenId === null) return null;
    const name = getNameFromTokenId(lastMintedTokenId);
    return name ?? "Minted FarFISH";
  }, [lastMintedTokenId]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Home" />

      <div className="mt-4 flex-1 flex flex-col">
        {/* MINT CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Mint FarFISH NFTs</h2>
              <p className="text-xs text-white/60">
                Total supply: {totalMaxSupply || "—"} • Species: Bluefin, GoldRay, RedSpike, ShadowGill
              </p>
            </div>
          </div>

          {!NFT_CONTRACT_ADDRESS && (
            <div className="w-full mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-200">
              Mint disabled — contract address is not configured.
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <p className="text-xs text-white/60">Minted</p>
              <p className="font-bold">{loadingSupplies ? "—" : totalMinted}</p>
              {errorMessage && (
                <p className="text-[11px] text-red-300 mt-1">Supply data unavailable</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/60">Progress</p>
              <p className="font-bold">
                {loadingSupplies ? "—" : `${mintedProgress.toFixed(2)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Remaining</p>
              <p className="font-bold">{loadingSupplies ? "—" : totalRemaining}</p>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1]"
              style={{ width: `${mintedProgress}%` }}
            />
          </div>

          {/* PRIMARY ACTION BUTTON */}
          {blocked ? (
            <div className="w-full mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-center text-xs font-semibold text-red-400">
              {message}
            </div>
          ) : (
            <div className="w-full mt-4">
              <button
                type="button"
                onClick={handleMint}
                disabled={primaryButtonDisabled}
                className={primaryButtonClasses}
              >
                {primaryButtonLabel}
              </button>
              {lastMintedDisplay && (
                <p className="mt-2 text-xs text-green-400">
                  Minted: {lastMintedDisplay}
                  {mintedTokenUri && (
                    <a
                      href={mintedTokenUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline"
                    >
                      View NFT
                    </a>
                  )}
                </p>
              )}
              {isMintConfirmed && (
                <p className="mt-2 text-xs text-green-400">
                  Mint transaction confirmed on-chain.
                </p>
              )}
            </div>
          )}

          {/* SHARE BUTTON */}
          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={handleShare}
              className="w-full bg-white/10 text-white py-3 rounded-lg text-sm transition hover:bg-white/20"
            >
              Share
            </button>
          </div>

          {toast && (
            <div
              className={`mt-3 text-xs font-semibold rounded-lg border p-3 ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                  : "bg-red-500/10 border-red-500/20 text-red-200"
              }`}
            >
              {toast.message}
            </div>
          )}
        </div>

        {/* WHY MINT */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Why mint a FarFISH?</h3>
          <ul className="text-sm text-white/70 space-y-1 pl-4">
            <li>• Staking rewards (30/90/180/360 days)</li>
            <li>• Multiple NFT types (Bluefin, GoldRay, RedSpike, ShadowGill)</li>
            <li>• Limited editions</li>
            <li>• Powering growth in the Base ecosystem</li>
          </ul>
        </div>

        {/* COLLECTION PREVIEW */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Collection Preview</h3>
          <div className="grid grid-cols-2 gap-3">
            {GALLERY_IMAGES.map((src, idx) => (
              <div
                key={src}
                className="relative bg-white/10 rounded-lg aspect-square overflow-hidden"
              >
                <Image
                  src={src}
                  alt={`Artwork ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
