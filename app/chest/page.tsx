"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "viem/chains";
import { sdk } from "@farcaster/miniapp-sdk";

import Header from "../components/Header";
import ChestCard from "../components/ChestCard";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

import claimControllerAbi from "../abi/claimController.json";
import { CLAIM_CONTROLLER_ADDRESS } from "../constants";

/* ---------------- helpers ---------------- */
const formatTime = (seconds: bigint | number): string => {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!s || s <= 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ---------------- ROTATING TEXTS ---------------- */
const ROTATING_CHEST_TEXTS = [
  "Daily Bronze Chest unlocked 🟤🐟\n\nClaim 3 FRH every day on FarFISH.\nFree, simple, on Base.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Another day, another Bronze Chest 🟤\n\nFarFISH rewards consistency.\nFree FRH daily on Base.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Daily check-in complete ✅\n\nBronze Chest claimed on FarFISH.\nFree FRH for real users.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Small daily rewards > big promises.\n\nBronze Chest unlocked on FarFISH 🐟\nFree FRH, every day.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Consistency pays 🟤\n\nClaim your daily Bronze Chest on FarFISH.\nFree FRH on Base.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Daily Bronze Chest claimed 🐟\n\nFarFISH keeps rewarding active users.\nFree FRH, no tricks.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Free daily rewards, done right.\n\nBronze Chest unlocked on FarFISH 🟤\nBuilt on Base.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Daily habit unlocked 🔁\n\nBronze Chest claimed on FarFISH.\n3 FRH every day.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "No hype. Just daily rewards.\n\nBronze Chest unlocked on FarFISH 🐟\nFree FRH on Base.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
  "Another Bronze Chest day 🟤\n\nFarFISH rewards show up daily.\nFree FRH, claim yours.\n\nhttps://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish",
];

export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === base.id;

  useFarcasterEnvironment("Chest");

  const [bronzeStep, setBronzeStep] =
    useState<"idle" | "share" | "claim">("idle");
  const [showSharePopup, setShowSharePopup] = useState(false);

  /* ================= DAILY BRONZE ================= */
  const { data: dailyData } = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS,
    abi: claimControllerAbi,
    functionName: "canClaimDailyChest",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  const daily = useMemo(() => {
    if (!dailyData || !Array.isArray(dailyData)) return null;
    return {
      canClaim: Boolean(dailyData[0]),
      timeLeft: BigInt(dailyData[1]),
    };
  }, [dailyData]);

  const {
    writeContract: claimDaily,
    data: dailyTx,
    isPending: dailyPending,
  } = useWriteContract();

  const { isLoading: dailyConfirming } = useWaitForTransactionReceipt({
    hash: dailyTx,
  });

  const handleBronzeOpen = () => {
    setBronzeStep("share");
    setShowSharePopup(true);
  };

  const handleBronzeShare = async () => {
    const text =
      ROTATING_CHEST_TEXTS[
        Math.floor(Math.random() * ROTATING_CHEST_TEXTS.length)
      ];

    await sdk.actions.composeCast({ text });

    setShowSharePopup(false);
    setBronzeStep("claim");
  };

  const handleBronzeClaim = useCallback(() => {
    if (!daily?.canClaim || !address) return;

    claimDaily({
      address: CLAIM_CONTROLLER_ADDRESS,
      abi: claimControllerAbi,
      functionName: "claimDailyChest",
      args: [],
      account: address,
      chain: base,
    });
  }, [daily, address, claimDaily]);

  /* ================= SILVER ================= */
  const { data: silverData } = useReadContract({
    address: CLAIM_CONTROLLER_ADDRESS,
    abi: claimControllerAbi,
    functionName: "canClaimSilverChest",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && isBase) },
  });

  const silver = useMemo(() => {
    if (!silverData || !Array.isArray(silverData)) return null;
    return {
      canClaim: Boolean(silverData[0]),
      timeLeft: BigInt(silverData[1]),
      hasStaked: Boolean(silverData[2]),
    };
  }, [silverData]);

  const {
    writeContract: claimSilver,
    isPending: silverPending,
  } = useWriteContract();

  const { isLoading: silverConfirming } = useWaitForTransactionReceipt({
    hash: undefined,
  });

  const handleSilverClaim = useCallback(() => {
    if (!silver?.canClaim || !address) return;

    claimSilver({
      address: CLAIM_CONTROLLER_ADDRESS,
      abi: claimControllerAbi,
      functionName: "claimSilverChest",
      args: [],
      account: address,
      chain: base,
    });
  }, [silver, address, claimSilver]);

  /* ================= UI ================= */
  return (
    <div className="flex flex-col flex-1">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1">
        <ChestCard
          title="Daily Bronze Chest"
          description="Claim 3 FRH every 24 hours."
          variant="bronze"
          badge={daily?.canClaim ? "Ready" : "Cooling"}
          progress={daily?.canClaim ? 100 : 0}
          actionLabel={
            !daily?.canClaim
              ? `Next claim in: ${formatTime(daily?.timeLeft ?? 0n)}`
              : bronzeStep === "idle"
              ? "Open now (3 FRH)"
              : bronzeStep === "claim"
              ? "Claim 3 FRH"
              : "Open now (3 FRH)"
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !daily?.canClaim ||
            dailyPending ||
            dailyConfirming
          }
          onAction={
            bronzeStep === "idle"
              ? handleBronzeOpen
              : handleBronzeClaim
          }
        />

        <ChestCard
          title="Silver Chest"
          description="Stake at least 1 NFT to claim 6 FRH daily."
          variant="silver"
          badge={
            !silver?.hasStaked
              ? "Stake required"
              : silver?.canClaim
              ? "Ready"
              : "Cooling"
          }
          actionLabel={
            silver?.canClaim
              ? "Claim 6 FRH"
              : `Next claim in: ${formatTime(silver?.timeLeft ?? 0n)}`
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !silver?.hasStaked ||
            !silver?.canClaim ||
            silverPending ||
            silverConfirming
          }
          onAction={handleSilverClaim}
        />

        <ChestCard
          title="Activity Rewards (Airdrop and referral)"
          description="Monthly rewards based on activity."
          badge="Coming Soon"
          actionLabel="Not available"
          actionDisabled
        />
      </div>

      {showSharePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[90%] max-w-sm rounded-xl bg-[#0b0b0b] border border-white/10 p-4">
            <p className="text-xs text-white/70 text-center mb-4">
              To unlock today’s free Bronze Chest, please share the post below on Farcaster.
            </p>

            <button
              className="w-full rounded-lg bg-emerald-400 py-3 font-semibold text-black"
              onClick={handleBronzeShare}
            >
              Share on Farcaster
            </button>

            <button
              className="mt-3 w-full text-xs text-white/50"
              onClick={() => setShowSharePopup(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
