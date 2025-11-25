"use client";

import { useEffect, useMemo, useState } from "react";
import ChestCard from "../components/ChestCard";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import { supabase } from "../lib/supabase";

const DAY_MS = 1000 * 60 * 60 * 24;

const infoCopy = {
  bronze:
    "Free Daily Reward! Come back every 24 hours to claim 1 FRH token. Consistency is key to climbing the leaderboard.",
  silver:
    "Exclusive Staker Reward! Only holders with staked NFTs can open this chest. Earn 3x more rewards than the Bronze chest daily.",
  activity:
    "Monthly Activity Bonus! Accumulate points by completing quests. This reward pool unlocks on the 1st of every month. Don't forget to claim your hard-earned tokens!",
  staking:
    "Yield from your Staked NFTs. Rewards are based on the rarity of your cards (Common to Legendary). Legendary NFTs earn the highest APY. Claims open monthly on the 1st.",
};

const rarityMultipliers: Record<"common" | "rare" | "epic" | "legendary", number> =
  {
    common: 1,
    rare: 1.5,
    epic: 2,
    legendary: 3,
  };

const formatDuration = (ms: number) => {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

export default function ChestView() {
  const { user } = useUser();
  const stakedCount = user?.stats?.staked ?? 0;

  const [dailyAvailable, setDailyAvailable] = useState(true);
  const [dailyRemainingMs, setDailyRemainingMs] = useState(0);
  const [activityUnlocked, setActivityUnlocked] = useState(false);
  const [stakingUnlockedFlag, setStakingUnlockedFlag] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; description: string } | null>(null);

  // Farcaster environment detection
  useEffect(() => {
    const isInFarcaster = 
      typeof navigator !== 'undefined' && /Farcaster|Warpcast/i.test(navigator.userAgent || "") ||
      typeof window !== 'undefined' && window.parent !== window ||
      typeof document !== 'undefined' && document.referrer?.includes('farcaster');
    
    if (isInFarcaster) {
      console.log('ChestView running in Farcaster environment');
    }
  }, []);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const isFirstDay = now.getDate() === 1;

  useEffect(() => {
    const wallet = user?.walletAddress;
    if (!wallet) {
      setDailyAvailable(true);
      setDailyRemainingMs(0);
      return;
    }

    const updateDailyState = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("last_daily_claim_at")
          .eq("wallet_address", wallet)
          .limit(1)
          .maybeSingle();
        const lastClaim = Number((data as any)?.last_daily_claim_at ?? 0);
        if (!lastClaim) {
          setDailyAvailable(true);
          setDailyRemainingMs(0);
          return;
        }
        const elapsed = Date.now() - lastClaim;
        if (elapsed >= DAY_MS) {
          setDailyAvailable(true);
          setDailyRemainingMs(0);
        } else {
          setDailyAvailable(false);
          setDailyRemainingMs(DAY_MS - elapsed);
        }
      } catch {
        setDailyAvailable(true);
        setDailyRemainingMs(0);
      }
    };

    updateDailyState();
    const interval = window.setInterval(updateDailyState, 60_000);
    return () => window.clearInterval(interval);
  }, [user?.walletAddress]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const activityClaimedMonth = window.localStorage.getItem("ff_activity_claimed_month");
    const activityStoredUnlocked = window.localStorage.getItem("ff_activity_unlocked") === "1";

    if (isFirstDay) {
      window.localStorage.setItem("ff_activity_unlocked", "1");
      window.localStorage.removeItem("ff_activity_claimed_month");
      setActivityUnlocked(true);
    } else if (activityStoredUnlocked && activityClaimedMonth !== monthKey) {
      setActivityUnlocked(true);
    } else {
      setActivityUnlocked(false);
    }

    const stakingClaimedMonth = window.localStorage.getItem("ff_staking_claimed_month");
    const stakingStoredUnlocked = window.localStorage.getItem("ff_staking_unlocked") === "1";

    if (isFirstDay) {
      window.localStorage.setItem("ff_staking_unlocked", "1");
      window.localStorage.removeItem("ff_staking_claimed_month");
      setStakingUnlockedFlag(true);
    } else if (stakingStoredUnlocked && stakingClaimedMonth !== monthKey) {
      setStakingUnlockedFlag(true);
    } else {
      setStakingUnlockedFlag(false);
    }
  }, [isFirstDay, monthKey]);

  const dailyProgress = dailyAvailable
    ? 100
    : Math.max(0, 100 - Math.round((dailyRemainingMs / DAY_MS) * 100));

  const chestDescriptions = {
    daily: dailyAvailable
      ? "Claim 1 FRH token every 24 hours."
      : `Next claim available in ${formatDuration(dailyRemainingMs)}.`,
    stake: stakedCount > 0 ? `You have ${stakedCount} NFT(s) staked.` : "Stake at least 1 NFT to unlock.",
    activity: activityUnlocked
      ? "Monthly activity pot is open. Claim before it locks again."
      : "Unlocks on the 1st of every month.",
  };

  const rarityBreakdown = user?.stats?.rarityBreakdown ?? {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  const stakingReward = useMemo(() => {
    return (
      Object.entries(rarityBreakdown).reduce((acc, [rarity, count]) => {
        const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] ?? 1;
        return acc + multiplier * (count as number);
      }, 0) * 2
    );
  }, [rarityBreakdown]);

  const stakingUnlocked = stakingUnlockedFlag && stakedCount > 0 && stakingReward > 0;

  const openModal = (title: string, description: string) => {
    setInfoModal({ title, description });
  };

  const handleDailyClaim = async () => {
    if (!dailyAvailable) return;
    const wallet = user?.walletAddress;
    if (!wallet) return;
    try {
      await supabase
        .from("profiles")
        .update({ last_daily_claim_at: Date.now() })
        .eq("wallet_address", wallet);
      setDailyAvailable(false);
      setDailyRemainingMs(DAY_MS);
    } catch {}
  };

  const handleStakeClaim = () => {
    if (stakedCount <= 0) return;
  };

  const handleActivityClaim = () => {
    if (!activityUnlocked || typeof window === "undefined") return;
    setActivityUnlocked(false);
    window.localStorage.setItem("ff_activity_unlocked", "0");
    window.localStorage.setItem("ff_activity_claimed_month", monthKey);
  };

  const handleStakingClaim = () => {
    if (!stakingUnlocked || typeof window === "undefined") return;
    setStakingUnlockedFlag(false);
    window.localStorage.setItem("ff_staking_unlocked", "0");
    window.localStorage.setItem("ff_staking_claimed_month", monthKey);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Chest" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-white/70">
            Rewards refresh daily and monthly based on the FarFISH economy rules. Stay active, stake NFTs, and
            never miss a claim window.
          </p>
        </section>

        <ChestCard
          title="Daily Bronze Chest"
          description={chestDescriptions.daily}
          badge={dailyAvailable ? "Ready" : "Cooling"}
          progress={dailyProgress}
          variant="bronze"
          actionLabel={dailyAvailable ? "Open now (1 FRH)" : "Come back soon"}
          actionDisabled={!dailyAvailable}
          onAction={handleDailyClaim}
          infoLabel="Info"
          onInfo={() => openModal("Daily Bronze Chest", infoCopy.bronze)}
        />

        <ChestCard
          title="Stake Chest (Silver)"
          description={chestDescriptions.stake}
          badge={stakedCount > 0 ? "Ready" : "Locked"}
          progress={stakedCount > 0 ? 100 : 0}
          variant="silver"
          actionLabel={stakedCount > 0 ? "Open now (3 FRH)" : "Stake NFTs to unlock"}
          actionDisabled={stakedCount <= 0}
          onAction={handleStakeClaim}
          onInfo={() => openModal("Stake Chest (Silver)", infoCopy.silver)}
        />

        <ChestCard
          title="Activity Rewards (Monthly)"
          description={chestDescriptions.activity}
          badge={activityUnlocked ? "Claim" : "Locked"}
          progress={activityUnlocked ? 100 : 0}
          variant="default"
          actionLabel={activityUnlocked ? "Claim monthly bonus" : "Locked until 1st"}
          actionDisabled={!activityUnlocked}
          onAction={handleActivityClaim}
          onInfo={() => openModal("Activity Rewards", infoCopy.activity)}
        />

        <ChestCard
          title="NFT Staking Rewards"
          description={
            stakingUnlocked
              ? `Ready to claim ${stakingReward.toFixed(1)} FRH based on rarity multipliers.`
              : "Unlocks on the 1st and requires staked NFTs to accrue yield."
          }
          badge={stakingUnlocked ? "Claim" : "Locked"}
          progress={stakingUnlocked ? 100 : 0}
          variant="default"
          actionLabel={
            stakingUnlocked ? `Claim ${stakingReward.toFixed(1)} FRH` : "Requires staked NFTs + unlock"
          }
          actionDisabled={!stakingUnlocked}
          onAction={handleStakingClaim}
          onInfo={() => openModal("NFT Staking Rewards", infoCopy.staking)}
        />
      </div>

      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-12 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050e18] p-5 shadow-2xl">
            <h4 className="text-lg font-semibold">{infoModal.title}</h4>
            <p className="mt-2 text-sm text-white/70">{infoModal.description}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] py-3 text-sm font-semibold text-black"
              onClick={() => setInfoModal(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
