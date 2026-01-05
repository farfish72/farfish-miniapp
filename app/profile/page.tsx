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
    question: "1. What is FarFISH?",
    answer: "FarFISH is a daily habit-building app on Base that rewards consistent on-chain activity. Connect your wallet, complete tasks, and earn FRH tokens.",
  },
  {
    question: "2. How do I earn FRH tokens?",
    answer: "Claim daily rewards in Chest, complete social tasks in Steam, stake NFTs for bonus rewards, and refer friends to the platform.",
  },
  {
    question: "3. What are the main features?",
    answer: "Chest (daily rewards), Steam (task completion), Stake (NFT staking), Rank (leaderboard), and Profile (your stats and identity).",
  },
  {
    question: "4. How does staking work?",
    answer: "Mint or buy FarFISH NFTs, then stake them to earn higher daily rewards and unlock premium features. Unstake anytime.",
  },
  {
    question: "5. What determines my rank?",
    answer: "Your rank is based solely on the total amount of FRH tokens you hold. More FRH = higher rank on the leaderboard.",
  },
  {
    question: "6. Is my data safe?",
    answer: "Yes. FarFISH is non-custodial and built on Base blockchain. You control your wallet and assets at all times.",
  },
  {
    question: "7. How do referrals work?",
    answer: "Share your referral link to earn 40 FRH per new user. Reach milestones (5, 10, 30, 50 referrals) for bonus rewards.",
  },
  {
    question: "8. When can I trade FRH?",
    answer: "FRH token listing is planned for Q1 2026. Until then, focus on building your daily habits and accumulating tokens.",
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
        {/* A) BASIC PROFILE SECTION - ALWAYS VISIBLE */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            {/* Avatar - always visible with fallback */}
            <div className="relative">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-white/20">
                <Image
                  src={getAvatarUrl()}
                  alt="Profile Avatar"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  unoptimized
                />
                {/* Edit icon for custom avatar */}
                <label className="absolute top-1 right-1 bg-blue-500 rounded-full p-1.5 cursor-pointer border-2 border-white/90 shadow-lg hover:bg-blue-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          localStorage.setItem('profileImage', result);
                          window.location.reload();
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Username - always visible with fallback */}
            <div className="flex-1">
              <div className="flex items-center gap-2 group relative">
                <input
                  type="text"
                  className="text-2xl font-bold bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none w-full pr-8"
                  defaultValue={getUsername()}
                  placeholder="Enter username"
                  onBlur={(e) => {
                    const newUsername = e.target.value.trim();
                    if (newUsername) {
                      localStorage.setItem('username', newUsername);
                    } else {
                      localStorage.removeItem('username');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
                <div className="absolute right-2 text-white/50 group-focus-within:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
              </div>
              
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-blue-300">Profile always accessible</span>
                </div>
              </div>
            </div>
          </div>
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

        {/* C) FARCASTER SECTION - CONDITIONAL */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-white">Social Profile</h3>
          </div>
          
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
                <div className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-1 border border-white/90">
                  <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.2 12c0-6.2-5-11.2-11.2-11.2S.8 5.8.8 12s5 11.2 11.2 11.2S23.2 18.2 23.2 12z"/>
                  </svg>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="text-lg font-bold text-white mb-1">
                  @{farcasterContext.username}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
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
