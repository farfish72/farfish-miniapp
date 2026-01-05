// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useAccount, useChainId } from "wagmi";
import { base } from "viem/chains";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import { NFT_CONTRACT_ADDRESS } from "../constants";
import nftDropAbi from "../abi/nftDrop.json";
import useUserStakes from "../hooks/useUserStakes";
import { sdk } from "@farcaster/miniapp-sdk";

type FarcasterContext = {
  fid: number;
  username: string;
  pfpUrl: string;
} | null;

type ToastState = { type: "error" | "success"; message: string } | null;

type LiveStats = {
  nftsOwned: number;
  chestStreak: number;
  rank: number | null;
};

const faqItems = [
  {
    question: "What is FarFISH?",
    answer: "FarFISH is a daily habit building app on Base that rewards you for staying active on chain. Just connect your wallet, complete simple tasks, and earn FRH tokens every day.",
  },
  {
    question: "How do I earn FRH tokens?",
    answer: "There are several ways to earn. Claim your daily rewards in the Chest section, complete social tasks in Steam, stake your NFTs for bonus rewards, and invite friends to join the platform.",
  },
  {
    question: "What are the main features?",
    answer: "The app has five main sections. Chest for claiming daily rewards, Steam for completing tasks, Stake for earning with your NFTs, Rank to see the leaderboard, and Profile to track your progress.",
  },
  {
    question: "How does staking work?",
    answer: "First you need to mint or buy FarFISH NFTs. Then you can stake them to earn higher daily rewards and unlock premium features. You can unstake them whenever you want.",
  },
  {
    question: "What determines my rank?",
    answer: "Your rank depends entirely on how many FRH tokens you hold in total. The more FRH you have, the higher you climb on the leaderboard.",
  },
  {
    question: "Is my data safe?",
    answer: "Absolutely. FarFISH is non custodial and built on the Base blockchain. This means you always control your own wallet and assets. We never hold your funds.",
  },
  {
    question: "How do referrals work?",
    answer: "Share your personal referral link with friends and earn 40 FRH for each new user who joins. Hit certain milestones like 5, 10, 30, or 50 referrals to unlock bonus rewards.",
  },
  {
    question: "When can I trade FRH?",
    answer: "FRH token listing is planned for the first quarter of 2026. Until then, focus on building your daily habits and collecting as many tokens as possible.",
  },
];

const formatStatValue = (value: number | string | undefined, suffix = "") => {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${value}${suffix}`;
};

const TOKEN_IDS = Array.from({ length: 16 }, (_, i) => i); // 0-15

function ProfilePageContent() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [toast, setToast] = useState<ToastState>(null);
  const { stakes } = useUserStakes();

  // Farcaster context state (read-only, non-blocking)
  const [farcasterContext, setFarcasterContext] = useState<FarcasterContext>(null);
  const [loadingFarcasterContext, setLoadingFarcasterContext] = useState(true);

  // Wallet-dependent stats (only loaded when wallet connected)
  const [liveStats, setLiveStats] = useState<LiveStats>({ nftsOwned: 0, chestStreak: 0, rank: null });
  const [loadingStats, setLoadingStats] = useState(false);

  const isBaseNetwork = chainId === base.id;

  // Basic profile data (always available)
  const getUsername = () => {
    const localUsername = typeof window !== "undefined" ? localStorage.getItem('username') : null;
    if (localUsername && localUsername.trim()) {
      return localUsername.trim();
    }
    if (farcasterContext?.username) {
      return `@${farcasterContext.username}`;
    }
    return "Guest";
  };

  const getAvatarUrl = () => {
    const localImage = typeof window !== "undefined" ? localStorage.getItem('profileImage') : null;
    if (localImage && localImage.trim()) {
      return localImage;
    }
    if (farcasterContext?.pfpUrl) {
      return farcasterContext.pfpUrl;
    }
    return "/farfish-logo.png";
  };

  // Read Farcaster context on page load (non-blocking)
  useEffect(() => {
    const loadFarcasterContext = async () => {
      setLoadingFarcasterContext(true);
      try {
        sdk.actions.ready();
        const context = await sdk.context;
        
        if (context?.user?.fid) {
          setFarcasterContext({
            fid: context.user.fid,
            username: context.user.username || `user-${context.user.fid}`,
            pfpUrl: context.user.pfpUrl || "/farfish-logo.png"
          });
        } else {
          setFarcasterContext(null);
        }
      } catch (error) {
        console.log("Not in Farcaster environment:", error);
        setFarcasterContext(null);
      } finally {
        setLoadingFarcasterContext(false);
      }
    };

    loadFarcasterContext();
  }, []);

  // Wallet-dependent stats (only when wallet connected)
  type StatsErrorState = { nftsOwned: boolean; chestStreak: boolean; rank: boolean };
  const [statsError, setStatsError] = useState<StatsErrorState>({
    nftsOwned: false,
    chestStreak: false,
    rank: false,
  });
  const [statsRefreshToken, setStatsRefreshToken] = useState(0);

  const fetchLiveStats = useCallback(async () => {
    if (!address) {
      setLiveStats({ nftsOwned: 0, chestStreak: 0, rank: null });
      setStatsError({ nftsOwned: false, chestStreak: false, rank: false });
      return;
    }

    setLoadingStats(true);
    setStatsError({ nftsOwned: false, chestStreak: false, rank: false });
    try {
      // Fetch NFT owned count
      let nftsOwned = 0;
      if (NFT_CONTRACT_ADDRESS) {
        try {
          const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
          if (publicClient) {
            const balancePromises = TOKEN_IDS.map((id) =>
              (publicClient.readContract as any)({
                address: NFT_CONTRACT_ADDRESS as `0x${string}`,
                abi: nftDropAbi as any,
                functionName: "balanceOf",
                args: [address as `0x${string}`, BigInt(id)],
              }) as Promise<bigint>
            );
            const balances = await Promise.all(balancePromises);
            nftsOwned = balances.reduce((sum, balance) => sum + Number(balance), 0);
          }
        } catch (error) {
          console.error("Failed to fetch NFT owned count:", error);
          setStatsError((prev) => ({ ...prev, nftsOwned: true }));
        }
      }

      // Fetch chest streak from KV (via API)
      let chestStreak = 0;
      try {
        const streakRes = await fetch(`/api/profile/streak?wallet=${address}`, {
          headers: { "x-user-wallet": address },
          cache: "no-store",
        });
        if (streakRes.ok) {
          const streakData = await streakRes.json();
          chestStreak = Number(streakData?.streakDays ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch chest streak:", error);
        setStatsError((prev) => ({ ...prev, chestStreak: true }));
      }

      // Fetch rank from leaderboard API
      let rank: number | null = null;
      try {
        const rankRes = await fetch(`/api/leaderboard/user?wallet=${address}`, {
          cache: "no-store",
        });
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          rank = Number(rankData?.rank ?? 0) > 0 ? Number(rankData.rank) : null;
        }
      } catch (error) {
        console.error("Failed to fetch rank:", error);
        setStatsError((prev) => ({ ...prev, rank: true }));
      }

      setLiveStats({ nftsOwned, chestStreak, rank });
    } catch (error) {
      console.error("Failed to fetch live stats:", error);
      setStatsError((prev) => ({
        nftsOwned: prev.nftsOwned || true,
        chestStreak: prev.chestStreak || true,
        rank: prev.rank || true,
      }));
    } finally {
      setLoadingStats(false);
    }
  }, [address, statsRefreshToken]);

  // Only fetch stats when wallet is connected
  useEffect(() => {
    if (address) {
      fetchLiveStats();
    }
  }, [fetchLiveStats, address]);

  // Listen for global staking updates so Profile stays in sync with on-chain state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setStatsRefreshToken((prev) => prev + 1);
    };
    window.addEventListener("farfish:staking-updated", handler);
    return () => {
      window.removeEventListener("farfish:staking-updated", handler);
    };
  }, []);

  // Wallet stats (only when connected)
  const stats = useMemo(
    () => [
      {
        label: "NFT Owned",
        value: loadingStats ? "…" : statsError.nftsOwned ? "Error" : formatStatValue(liveStats.nftsOwned),
      },
      {
        label: "Staked NFT",
        value: loadingStats ? "…" : formatStatValue(stakes.length),
      },
      {
        label: "Chest Streak",
        value: loadingStats ? "…" : statsError.chestStreak ? "Error" : formatStatValue(liveStats.chestStreak, " days"),
      },
      {
        label: "Rank",
        value: loadingStats ? "…" : statsError.rank ? "Error" : (liveStats.rank && liveStats.rank > 0 ? `#${liveStats.rank}` : "Unranked"),
      },
    ],
    [liveStats, loadingStats, statsError, stakes.length]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Profile" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        {/* SOCIAL PROFILE SECTION - PRIMARY HEADER */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          {loadingFarcasterContext ? (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-white/10 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                <div className="h-3 bg-white/10 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>
          ) : farcasterContext ? (
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-purple-400/50">
                <Image
                  src={farcasterContext.pfpUrl}
                  alt="Social Profile"
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
              
              <div className="flex-1">
                <div className="text-lg font-bold text-white mb-1">
                  @{farcasterContext.username}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-300">
                    FID: {farcasterContext.fid}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-white/60 mb-2">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.2 12c0-6.2-5-11.2-11.2-11.2S.8 5.8.8 12s5 11.2 11.2 11.2S23.2 18.2 23.2 12z"/>
                </svg>
              </div>
              <p className="text-white/70 text-sm mb-2">Social profile not connected</p>
              <p className="text-white/50 text-xs">Open inside the social platform to link your profile</p>
            </div>
          )}
        </section>

        {/* B) WALLET SECTION - CONDITIONAL */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-white">Wallet Connection</h3>
          </div>
          
          {isConnected && address ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-300">Wallet connected</span>
              </div>
              
              {/* Wallet Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border border-white/10 bg-white/5 p-3 text-center ${
                      loadingStats ? "animate-pulse" : ""
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-white/60">
                      {stat.label}
                    </p>
                    <p className="text-lg font-semibold mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>
              
              {Object.values(statsError).some(Boolean) && !loadingStats && (
                <p className="text-xs text-red-300 text-center">
                  Some stats failed to load. Try again later.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/70 mb-4">Connect your wallet to view stats and access features</p>
              <WalletConnect />
            </div>
          )}
        </section>

        {/* FAQ SECTION - ALWAYS VISIBLE */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-3">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {faqItems.map((faq, idx) => {
              const open = openIdx === idx;
              return (
                <div
                  key={faq.question}
                  className="rounded-xl border border-white/10 bg-white/5"
                >
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenIdx(open ? null : idx)}
                  >
                    <span className="font-medium text-sm">{faq.question}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-sm text-white/70">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border-red-400/40 bg-red-500/15 text-red-100"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-40 h-10 rounded-xl bg-white/10 animate-pulse" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
