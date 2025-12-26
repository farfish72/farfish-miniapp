"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import TrustAnchor from "../components/TrustAnchor";
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
  "Daily Bronze Chest unlocked 🟤🐟\n\nClaim 3 FRH every day on FarFISH.\nFree, simple, on Base.",
  "Another day, another Bronze Chest 🟤\n\nFarFISH rewards consistency.\nFree FRH daily on Base.",
  "Daily check-in complete ✅\n\nBronze Chest claimed on FarFISH.\nFree FRH for real users.",
  "Small daily rewards > big promises.\n\nBronze Chest unlocked on FarFISH 🐟\nFree FRH, every day.",
  "Consistency pays 🟤\n\nClaim your daily Bronze Chest on FarFISH.\nFree FRH on Base.",
  "Daily Bronze Chest claimed 🐟\n\nFarFISH keeps rewarding active users.\nFree FRH, no tricks.",
  "Free daily rewards, done right.\n\nBronze Chest unlocked on FarFISH 🟤\nBuilt on Base.",
  "Daily habit unlocked 🔁\n\nBronze Chest claimed on FarFISH.\n3 FRH every day.",
  "No hype. Just daily rewards.\n\nBronze Chest unlocked on FarFISH 🐟\nFree FRH on Base.",
  "Another Bronze Chest day 🟤\n\nFarFISH rewards show up daily.\nFree FRH, claim yours.",
];

const FARFISH_MINIAPP_URL =
  "https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish";

/* ---------------- page ---------------- */
export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === base.id;

  useFarcasterEnvironment("Chest");

  const [bronzeStep, setBronzeStep] =
    useState<"idle" | "share" | "claim">("idle");
  const [showSharePopup, setShowSharePopup] = useState(false);
  
  // Trust Anchor state
  const [trustAnchorData, setTrustAnchorData] = useState({
    streak: null as number | null,
    claimedToday: 0,
    holding: null as number | null,  // Will hold ERC20 balance
    rank: null as number | null,     // Will hold rank from KV
    referrals: null as number | null,
    recasts: null as number | null,
  });

  // Read ERC20 balance
  const { data: balanceData } = useReadContract({
    address: process.env.NEXT_PUBLIC_ERC20_TOKEN_ADDRESS as `0x${string}`,
    abi: [{
      "constant": true,
      "inputs": [{"name": "_owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "balance", "type": "uint256"}],
      "type": "function"
    }],
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  // Fetch KV data (rank, referrals, recasts)
  useEffect(() => {
    const fetchKVData = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`/api/trust-anchor?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          setTrustAnchorData(prev => ({
            ...prev,
            rank: data.rank || null,
            referrals: data.referrals || null,
            recasts: data.recasts || null,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch KV data:', error);
      }
    };
    
    fetchKVData();
  }, [address]);

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

    try {
      await sdk.actions.composeCast({
        text,
        embeds: [FARFISH_MINIAPP_URL],
        close: false,
      });
    } catch (err) {
      console.error("Farcaster compose failed:", err);
    }

    setShowSharePopup(false);
    setBronzeStep("claim");
  };

  const handleBronzeClaim = useCallback(() => {
    if (!daily?.canClaim || !address) return;

    // Mark bronze as claimed today in localStorage
    localStorage.setItem('ff_bronze_claimed_today', 'true');
    
    // Update total rewards
    const currentTotal = parseFloat(localStorage.getItem('ff_total_rewards') || '0');
    localStorage.setItem('ff_total_rewards', (currentTotal + 3).toString());
    
    // Update streak and last claim date
    const lastClaimDate = localStorage.getItem('ff_last_claim_date');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastClaimDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const currentStreak = parseInt(localStorage.getItem('ff_streak') || '0', 10);
      
      if (lastClaimDate === yesterdayStr) {
        // Consecutive day - increment streak
        localStorage.setItem('ff_streak', (currentStreak + 1).toString());
      } else if (lastClaimDate !== today) {
        // Not consecutive - reset streak to 1
        localStorage.setItem('ff_streak', '1');
      }
      
      localStorage.setItem('ff_last_claim_date', today);
    }

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

    // Mark silver as claimed today in localStorage
    localStorage.setItem('ff_silver_claimed_today', 'true');
    
    // Update total rewards
    const currentTotal = parseFloat(localStorage.getItem('ff_total_rewards') || '0');
    localStorage.setItem('ff_total_rewards', (currentTotal + 6).toString());
    
    // Update streak and last claim date (same logic as bronze)
    const lastClaimDate = localStorage.getItem('ff_last_claim_date');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastClaimDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const currentStreak = parseInt(localStorage.getItem('ff_streak') || '0', 10);
      
      if (lastClaimDate === yesterdayStr) {
        // Consecutive day - increment streak
        localStorage.setItem('ff_streak', (currentStreak + 1).toString());
      } else if (lastClaimDate !== today) {
        // Not consecutive - reset streak to 1
        localStorage.setItem('ff_streak', '1');
      }
      
      localStorage.setItem('ff_last_claim_date', today);
    }

    claimSilver({
      address: CLAIM_CONTROLLER_ADDRESS,
      abi: claimControllerAbi,
      functionName: "claimSilverChest",
      args: [],
      account: address,
      chain: base,
    });
  }, [silver, address, claimSilver]);

  // Update Trust Anchor data when address changes or claims are made
  useEffect(() => {
    if (!address) return;

    // Get streak from localStorage
    const streak = localStorage.getItem('ff_streak');
    
    // Calculate claimed today from on-chain data
    let claimedToday = 0;
    if (dailyData && dailyData[0] === false) {  // If can't claim, means already claimed
      claimedToday += 3;  // Bronze chest value
    }
    if (silverData && silverData[0] === false) {  // If can't claim, means already claimed
      claimedToday += 6;  // Silver chest value
    }

    // Update state
    setTrustAnchorData(prev => ({
      ...prev,
      streak: streak ? parseInt(streak, 10) : null,
      claimedToday,
      holding: balanceData ? Number(balanceData) / 1e18 : null,  // Assuming 18 decimals
      // rank, referrals, recasts are updated by the KV fetch effect
    }));
  }, [address, dailyData, silverData, balanceData]);

  /* ================= UI ================= */
  return (
    <div className="flex flex-col flex-1">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1">
        <TrustAnchor
          streak={trustAnchorData.streak}
          claimedToday={trustAnchorData.claimedToday}
          holding={trustAnchorData.holding}
          rank={trustAnchorData.rank}
          referrals={trustAnchorData.referrals}
          recasts={trustAnchorData.recasts}
        />
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
              : "Claim 3 FRH"
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
