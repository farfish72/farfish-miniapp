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
import useUserStakes from "../hooks/useUserStakes";

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

const FARFISH_MINIAPP_URL = "https://farfish-miniapp5.vercel.app";

/* ---------------- page ---------------- */
export default function ChestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === base.id;

  useFarcasterEnvironment("Chest");

  // Get user stakes to determine tier
  const { activeStakes } = useUserStakes();
  
  // Trust Anchor state
  const [trustAnchorData, setTrustAnchorData] = useState({
    streak: null as number | null,
    daysActive: null as number | null,
    referrals: null as number | null,
  });

  // Fetch referral data from KV
  useEffect(() => {
    const fetchReferralData = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`/api/leaderboard/user?wallet=${address}`);
        if (response.ok) {
          const data = await response.json();
          setTrustAnchorData(prev => ({
            ...prev,
            referrals: data.referrals_count || 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch referral data:', error);
      }
    };
    
    fetchReferralData();
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

  const handleShareProgress = async () => {
    const streak = localStorage.getItem('ff_streak') || '0';
    const streakNum = parseInt(streak, 10);
    
    const shareText = `I'm on Day ${streakNum} on FarFISH 🐟 building daily on-chain habits.`;

    try {
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [FARFISH_MINIAPP_URL],
        close: false,
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleBronzeClaim = useCallback(async () => {
    if (!daily?.canClaim || !address) return;

    try {
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

      await claimDaily({
        address: CLAIM_CONTROLLER_ADDRESS,
        abi: claimControllerAbi,
        functionName: "claimDailyChest",
        args: [],
        account: address,
        chain: base,
      });
    } catch (error) {
      console.error('Bronze claim error:', error);
      throw error; // Let ChestCard handle the error display
    }
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

  const handleSilverClaim = useCallback(async () => {
    if (!silver?.canClaim || !address) return;

    try {
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

      await claimSilver({
        address: CLAIM_CONTROLLER_ADDRESS,
        abi: claimControllerAbi,
        functionName: "claimSilverChest",
        args: [],
        account: address,
        chain: base,
      });
    } catch (error) {
      console.error('Silver claim error:', error);
      throw error; // Let ChestCard handle the error display
    }
  }, [silver, address, claimSilver]);

  // Update Trust Anchor data when address changes or claims are made
  useEffect(() => {
    if (!address) return;

    // Get streak from localStorage
    const streak = localStorage.getItem('ff_streak');
    
    // Calculate days active (cumulative, never resets)
    // For now, use a simple calculation based on streak and historical data
    // In a real implementation, this would be stored separately and never decrease
    const daysActive = localStorage.getItem('ff_days_active');
    let calculatedDaysActive = 0;
    
    if (daysActive) {
      calculatedDaysActive = parseInt(daysActive, 10);
    } else {
      // Initialize days active based on current streak if not set
      calculatedDaysActive = streak ? parseInt(streak, 10) : 0;
      localStorage.setItem('ff_days_active', calculatedDaysActive.toString());
    }
    
    // Update days active if current streak is higher (user has been more active)
    const currentStreak = streak ? parseInt(streak, 10) : 0;
    if (currentStreak > calculatedDaysActive) {
      calculatedDaysActive = currentStreak;
      localStorage.setItem('ff_days_active', calculatedDaysActive.toString());
    }

    // Update state
    setTrustAnchorData(prev => ({
      ...prev,
      streak: currentStreak,
      daysActive: calculatedDaysActive,
    }));
  }, [address, dailyData, silverData]);

  /* ================= UI ================= */
  return (
    <div className="flex flex-col flex-1">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1">
        {/* Daily Streak Indicator */}
        {trustAnchorData.streak && trustAnchorData.streak > 0 && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <h3 className="font-bold text-orange-400">Day {trustAnchorData.streak} streak</h3>
                  <p className="text-sm text-white/70">
                    {daily?.canClaim 
                      ? "Ready to claim today's reward" 
                      : `Next check-in available in ${formatTime(daily?.timeLeft ?? 0n)}`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleShareProgress}
                disabled={!isConnected}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 text-sm font-medium text-white transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                Share my progress
              </button>
            </div>
          </div>
        )}

        <TrustAnchor
          streak={trustAnchorData.streak}
          daysActive={trustAnchorData.daysActive}
          referrals={trustAnchorData.referrals}
          hasActiveStake={activeStakes.length > 0}
        />
        <ChestCard
          title="Daily Bronze Chest"
          description="Claim rewards every 24 hours."
          variant="bronze"
          badge={daily?.canClaim ? "Ready" : "Cooling"}
          progress={daily?.canClaim ? 100 : 0}
          actionLabel={
            daily?.canClaim 
              ? "Claim 3 FRH" 
              : `Next claim in: ${formatTime(daily?.timeLeft ?? 0n)}`
          }
          actionDisabled={
            !isConnected ||
            !isBase ||
            !daily?.canClaim ||
            dailyPending ||
            dailyConfirming
          }
          onAction={handleBronzeClaim}
        />

        <ChestCard
          title="Silver Chest"
          description="Stake tokens to unlock higher rewards."
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
          title="Future Rewards"
          description="More reward types coming soon."
          variant="default"
          badge="Coming Soon"
          actionLabel="Coming Soon"
          actionDisabled={true}
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
