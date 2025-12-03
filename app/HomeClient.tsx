// app/HomeClient.tsx
"use client";

import Image from "next/image";
import Header from "./components/Header";
import useFarcasterGate from "./hooks/useFarcasterGate";
import useFarcasterEnvironment from "./hooks/useFarcasterEnvironment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { NFT_CONTRACT_ADDRESS, NFT_SUPPLY_TOTAL } from "./constants";
import nftDropAbi from "./abi/nftDrop.json";
import { detectFarcasterEnvironment } from "./utils/farcaster";
import { supabase } from "./lib/supabase";
import useUser from "./hooks/useUser";

export default function HomeClient() {
  const { blocked, message } = useFarcasterGate();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [minted, setMinted] = useState<number | null>(null);
  const [mintedErrorMessage, setMintedErrorMessage] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
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
  const { contract } = useContract(NFT_CONTRACT_ADDRESS || undefined, "nft-drop");
  const {
    data: mintedCountRaw,
    error: mintedCountError,
  } = useContractRead(contract, "nextTokenIdToMint", []);
  // Generate referral link using user's FID
  const shareLink = useMemo(() => {
    const baseUrl = "https://farfish-miniapp5.vercel.app";
    const fid = user?.fid;
    if (fid) {
      return `${baseUrl}/share?ref=${fid}`;
    }
    return `${baseUrl}/share`;
  }, [user?.fid]);

  const shareMessage = useMemo(() => {
    return `Join FarFISH — Mint • Stake • Earn. Daily free chest + referral rewards. My link: ${shareLink}`;
  }, [shareLink]);
  const isFarcasterEnv = useFarcasterEnvironment("Home page");
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const deriveMinted = async () => {
      if (!NFT_CONTRACT_ADDRESS || !contract) {
        setMinted(null);
        setMintedErrorMessage(
          NFT_CONTRACT_ADDRESS ? "Unable to load supply data" : "Contract not configured",
        );
        return;
      }

      try {
        if (mintedCountRaw !== undefined && mintedCountRaw !== null) {
          const value = Number(mintedCountRaw ?? 0);
          if (!Number.isFinite(value)) {
            throw new Error("Minted count is not a finite number");
          }
          if (!cancelled) {
            setMinted(value);
            setMintedErrorMessage(null);
          }
          return;
        }

        if (mintedCountError) {
          const fallback = await contract.call?.("totalSupply");
          const fallbackValue = Number(fallback ?? 0);
          if (!Number.isFinite(fallbackValue)) {
            throw new Error("Fallback totalSupply value is not finite");
          }
          if (!cancelled) {
            setMinted(fallbackValue);
            setMintedErrorMessage(null);
          }
          return;
        }
      } catch (error) {
        console.error("Failed to fetch minted supply", error);
        if (!cancelled) {
          setMinted(0);
          setMintedErrorMessage("Unable to load supply data");
        }
      }
    };

    deriveMinted();

    return () => {
      cancelled = true;
    };
  }, [contract, mintedCountRaw, mintedCountError]);

  const mintedDisplay = useMemo(() => (minted === null ? "—" : minted), [minted]);

  const mintedProgress = useMemo(() => {
    if (minted === null) return 0;
    return Math.min(100, Math.max(0, (minted / NFT_SUPPLY_TOTAL) * 100));
  }, [minted]);

  const remainingSupply = useMemo(() => {
    if (minted === null) return "—";
    return Math.max(0, NFT_SUPPLY_TOTAL - minted);
  }, [minted]);

  const handleConnect = useCallback(() => {
    const connector = connectors[0];
    if (!connector) return;
    connect({ connector });
  }, [connect, connectors]);

  const handleMint = useCallback(() => {
    setToast(null);

    if (!NFT_CONTRACT_ADDRESS) {
      setToast({
        type: "error",
        message: "Contract missing — mint disabled",
      });
      return;
    }

    if (!address) {
      handleConnect();
      return;
    }

    try {
      writeMint({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: nftDropAbi as any,
        functionName: "claim",
        args: [address as `0x${string}`, BigInt(1)],
      } as any);
    } catch (error) {
      console.error("Mint transaction failed to start", error);
      setToast({
        type: "error",
        message: "Unable to start mint transaction",
      });
    }
  }, [address, handleConnect, writeMint]);

  const handleShare = useCallback(() => {
    const payload = shareMessage;
    const isInFarcaster = isFarcasterEnv || detectFarcasterEnvironment();

    if (isInFarcaster && typeof window !== "undefined" && (window as any).sdk) {
      (window as any).sdk.actions.openUrl(shareLink);
      setToast({ type: "success", message: "Share link opened in Farcaster" });
      return;
    }

    if (typeof window === "undefined") return;

    const tryShare = async () => {
      try {
        if (navigator.share) {
          await navigator.share({ text: payload, url: shareLink });
          setToast({ type: "success", message: "Share sheet opened" });
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
          setToast({ type: "success", message: "Link copied" });
          return;
        }

        throw new Error("No share or clipboard support");
      } catch (error) {
        console.error("Failed to share FarFISH", error);
        setToast({ type: "error", message: "Unable to share link" });
      }
    };

    void tryShare();
  }, [shareMessage, shareLink, isFarcasterEnv]);

  useEffect(() => {
    if (!mintError) return;
    setToast({
      type: "error",
      message: mintError.message || "Mint failed",
    });
  }, [mintError]);

  const toastMessage = useMemo(() => toast?.message ?? null, [toast]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle referral attribution
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (!refParam || !user?.walletAddress) return;

    const attributeReferral = async () => {
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("referred_by")
          .eq("wallet_address", user.walletAddress)
          .maybeSingle();

        if (existing?.referred_by) return; // Already attributed

        await supabase
          .from("profiles")
          .update({ referred_by: refParam })
          .eq("wallet_address", user.walletAddress);

        // Increment referrer's count
        const { data: referrer } = await supabase
          .from("profiles")
          .select("referrals_completed")
          .or(`wallet_address.eq.${refParam},fid.eq.${refParam}`)
          .maybeSingle();

        if (referrer) {
          await supabase
            .from("profiles")
            .update({ referrals_completed: (referrer.referrals_completed ?? 0) + 1 })
            .or(`wallet_address.eq.${refParam},fid.eq.${refParam}`);
        }
      } catch (error) {
        console.error("Failed to attribute referral", error);
      }
    };

    void attributeReferral();
  }, [searchParams, user?.walletAddress]);

  const GALLERY_IMAGES = useMemo(
    () => ["/fish1.jpg", "/fish2.jpg", "/fish3.jpg", "/fish4.jpg"],
    [],
  );

  const primaryButtonLabel = useMemo(() => {
    if (!NFT_CONTRACT_ADDRESS) return "Mint disabled";
    if (!address || !isConnected) return "Connect Farcaster wallet";
    if (isMintPending || isMintConfirming) return "Minting...";
    return "Mint FarFISH NFT";
  }, [address, isConnected, isMintPending, isMintConfirming]);

  const primaryButtonClasses = useMemo(() => {
    if (!NFT_CONTRACT_ADDRESS) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/10 text-white/50 cursor-not-allowed";
    }
    if (!address || !isConnected) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/15 text-white hover:bg-white/25 transition";
    }
    return "w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black transition disabled:opacity-60";
  }, [address, isConnected]);

  const primaryButtonDisabled =
    isConnecting || isMintPending || isMintConfirming || !NFT_CONTRACT_ADDRESS;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* উপরের FarFISH + Follow us + Home টাইটেল */}
      <Header title="Home" />

      {/* নিচে আসল হোম / মিন্ট কনটেন্ট */}
      <div className="mt-4 flex-1 flex flex-col">
        {/* MINT CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Mint FarFISH NFTs</h2>
              <p className="text-xs text-white/60">Total supply: 9999 • Reserved: 20</p>
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
              <p className="font-bold">{mintedDisplay}</p>
              {mintedErrorMessage && (
                <p className="text-[11px] text-red-300 mt-1">Supply data unavailable</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/60">Progress</p>
              <p className="font-bold">
                {minted === null ? "—" : `${mintedProgress.toFixed(2)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Remaining</p>
              <p className="font-bold">{remainingSupply}</p>
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
              {mintError && (
                <p className="mt-2 text-xs text-red-400">
                  {mintError.message}
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

          <p className="text-xs text-white/60 mt-2">
            Note: 20 NFTs are reserved for team/partners.
          </p>
        </div>

        {/* WHY MINT */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Why mint a FarFISH?</h3>
          <ul className="text-sm text-white/70 space-y-1 pl-4">
            <li>• Staking rewards (30/90/180/360 days)</li>
            <li>• Tier system &amp; exclusive drops</li>
            <li>• Limited editions</li>
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

