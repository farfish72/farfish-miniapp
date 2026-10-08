// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { base } from "viem/chains";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import { 
  User,
  Wallet, 
  Fire, 
  Crown, 
  Ranking,
  Lock,
  Handshake,
  SignOut,
  Copy,
  UserCircle 
} from "@phosphor-icons/react";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import { NFT_CONTRACT_ADDRESS } from "../constants";
import nftDropAbi from "../abi/nftDrop.json";
import useUserStakes from "../hooks/useUserStakes";
import { sdk } from "@farcaster/miniapp-sdk";
import { AppIcon } from "../components/ui";
import { useToast } from "../providers/ToastProvider";

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
    answer: "FarFISH is a daily habit-building app on Base that rewards consistent on-chain activity. Connect your wallet, complete tasks, and accumulate tokens before launch.",
  },
  {
    question: "2. How do I earn tokens?",
    answer: "Claim daily rewards in Chest, complete social tasks in Steam, lock NFTs for bonus yield, and refer friends to earn per referral.",
  },
  {
    question: "3. What are the main features?",
    answer: "Chest (daily check-in), Steam (task missions), Stake (NFT locking), Hall of Fame (rankings), and Profile (your stats and identity).",
  },
  {
    question: "4. How does NFT locking work?",
    answer: "Own a FarFISH NFT, then lock it for 30–360 days to earn yield. Rarer NFTs unlock higher multipliers. Release anytime after the lock period ends.",
  },
  {
    question: "5. What determines my rank?",
    answer: "Your rank is based on total referrals and token balance. More activity = higher standing in the Hall of Fame.",
  },
  {
    question: "6. Is my data safe?",
    answer: "Yes. FarFISH is non-custodial and built on Base. You control your wallet and assets at all times — we never hold your funds.",
  },
  {
    question: "7. How do referrals work?",
    answer: "Use a referral code when joining to earn 20 tokens! Share your code to help friends - you both earn 20 tokens each.",
  },
  {
    question: "8. When can I trade FRH?",
    answer: "FRH token listing is planned for Q1 2027. Until then, focus on building your daily habits and accumulating tokens.",
  },
];

const formatStatValue = (value: number | string | undefined, suffix = "") => {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${value}${suffix}`;
};

const TOKEN_IDS = Array.from({ length: 16 }, (_, i) => i); // 0-15

// Manual Refer Code Bind Component
function ManualReferCodeBind({ address }: { address: string }) {
  const [referCode, setReferCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null);
  const [checkingReferrer, setCheckingReferrer] = useState(true);
  const { showSuccess, showError } = useToast();

  // Check if user already has a referrer
  useEffect(() => {
    // Guard: only check if address is present
    if (!address) {
      setHasReferrer(null);
      setCheckingReferrer(false);
      return;
    }
    
    const controller = new AbortController();
    setCheckingReferrer(true);
    
    fetch(`/api/referral/check?wallet=${address}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setHasReferrer(data.hasReferrer || false);
        } else {
          setHasReferrer(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to check referrer:", err);
          setHasReferrer(false);
        }
      })
      .finally(() => setCheckingReferrer(false));
    
    return () => controller.abort();
  }, [address]); // Only re-run when address changes

  const handleBindReferCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!referCode.trim()) {
      showError("Please enter a referral code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/referral/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          refCode: referCode.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showSuccess("Referral code bound successfully! 🎉");
        setHasReferrer(true);
        setReferCode("");
        
        // Trigger refresh of stats
        window.dispatchEvent(new Event("farfish:referral-bound"));
      } else {
        // Show specific message for REFERRER_NOT_INITIALIZED
        if (data.code === "REFERRER_NOT_INITIALIZED") {
          showError("Code not activated yet — ask your referrer to open the app once first.");
        } else {
          showError(data.error || "Failed to bind referral code");
        }
      }
    } catch (error) {
      console.error("Bind referral error:", error);
      showError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Don't show if already has referrer
  if (checkingReferrer) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-3/4"></div>
      </div>
    );
  }

  if (hasReferrer) {
    return null; // Hide section if already referred
  }

  return (
    <div className="rounded-xl border border-teal/30 bg-teal/5 p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white">
        <Handshake size={16} weight="bold" />
        Enter Referral Code
      </h3>
      <form onSubmit={handleBindReferCode} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={referCode}
          onChange={(e) => setReferCode(e.target.value)}
          placeholder="e.g. 7a59d836"
          maxLength={8}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a1a] border border-white/30 text-white text-base placeholder:text-white/50 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !referCode.trim()}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-teal to-mint text-ink font-bold text-base hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "Binding..." : "Bind Code"}
        </button>
      </form>
    </div>
  );
}

function ProfilePageContent() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { showError, showSuccess } = useToast();
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

  // Get User ID from wallet address (last 8 chars)
  const getUserId = () => {
    if (!address) return "Guest";
    return address.slice(-8).toLowerCase();
  };

  // Handle wallet disconnect
  const handleDisconnect = () => {
    disconnect();
    showSuccess("Wallet disconnected");
  };

  // Handle copy User ID
  const handleCopyUserId = () => {
    const userId = getUserId();
    navigator.clipboard.writeText(userId).then(() => {
      showSuccess("User ID copied!");
    }).catch(() => {
      showError("Failed to copy User ID");
    });
  };

  // Get Tier based on active stakes
  const getTier = () => {
    return stakes.length > 0 ? "Premium" : "Basic";
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
        } else if (streakRes.status === 404) {
          // 404 means no streak record yet - this is expected for new users, show 0
          chestStreak = 0;
        } else {
          // Actual API error (500, etc.)
          console.error("Failed to fetch chest streak:", streakRes.status);
          setStatsError((prev) => ({ ...prev, chestStreak: true }));
        }
      } catch (error) {
        // Network error
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
        } else if (rankRes.status === 404) {
          // 404 means not in leaderboard yet - this is expected, show "No rank"
          rank = null;
        } else {
          // Actual API error (500, etc.)
          console.error("Failed to fetch rank:", rankRes.status);
          setStatsError((prev) => ({ ...prev, rank: true }));
        }
      } catch (error) {
        // Network error
        console.error("Failed to fetch rank:", error);
        setStatsError((prev) => ({ ...prev, rank: true }));
      }

      setLiveStats({ nftsOwned, chestStreak, rank });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
  // Debounce to avoid redundant API calls from rapid event firing
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handler = () => {
      // Debounce rapid events (batch within 500ms window)
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        setStatsRefreshToken((prev) => prev + 1);
      }, 500);
    };
    
    window.addEventListener("farfish:staking-updated", handler);
    window.addEventListener("farfish:referral-bound", handler);
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      window.removeEventListener("farfish:staking-updated", handler);
      window.removeEventListener("farfish:referral-bound", handler);
    };
  }, []);

  // Wallet stats (only when connected)
  const stats = useMemo(
    () => [
      {
        label: "NFTs Held",
        icon: Crown,
        value: loadingStats ? "…" : statsError.nftsOwned ? "Error" : formatStatValue(liveStats.nftsOwned),
      },
      {
        label: "NFTs Staked",
        icon: Lock,
        value: loadingStats ? "…" : formatStatValue(stakes.length),
      },
      {
        label: "Streak",
        icon: Fire,
        value: loadingStats ? "…" : statsError.chestStreak ? "Error" : formatStatValue(liveStats.chestStreak, " days"),
      },
      {
        label: "Rank",
        icon: Ranking,
        value: loadingStats ? "…" : statsError.rank ? "Error" : (liveStats.rank && liveStats.rank > 0 ? `#${liveStats.rank}` : "No rank"),
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

      <div className="mt-4 space-y-3 flex-1 flex flex-col pb-1">
        {/* WALLET CONNECT SECTION - SHOWN WHEN NOT CONNECTED */}
        {!isConnected && (
          <section className="app-panel">
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center shadow-lg">
                <Wallet size={40} weight="bold" className="text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-white/60 mb-4">
                  Connect your wallet to view your profile stats and manage your account
                </p>
              </div>
              <WalletConnect />
            </div>
          </section>
        )}

        {/* USER ID SECTION - ONLY VISIBLE WHEN CONNECTED */}
        {isConnected && address && (
          <section className="app-panel">
            <div className="flex items-start gap-3">
              <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center shadow-lg">
                <User size={36} weight="bold" className="text-white" />
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-lg font-bold text-white">
                    User ID: {getUserId()}
                  </div>
                  <button
                    onClick={handleCopyUserId}
                    aria-label="Copy User ID"
                    className="inline-flex items-center justify-center p-0 !bg-transparent !border-0 hover:opacity-80 transition"
                    title="Copy User ID"
                  >
                    <Copy size={18} weight="bold" className="text-white" />
                  </button>
                </div>
                <div className="text-sm text-white/60 mb-0.5">
                  Tier: {getTier()}
                </div>
                <div className="text-xs text-white/50">
                  Referral code is your User ID.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* WALLET STATS SECTION - ONLY VISIBLE WHEN CONNECTED */}
        {isConnected && address && (
          <section className="app-panel">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <Wallet size={20} weight="bold" className="text-white" />
                </div>
                <span className="text-base font-bold text-white">Wallet Stats</span>
              </div>
              <button
                onClick={handleDisconnect}
                aria-label="Disconnect wallet"
                className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15 transition"
                title="Disconnect wallet"
              >
                <SignOut size={16} weight="bold" className="text-white" />
              </button>
            </div>
            
            {/* Wallet Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => {
                const StatIcon = stat.icon;
                
                return (
                  <div
                    key={stat.label}
                    className={`rounded-xl border border-white/10 bg-white/5 p-4 ${
                      loadingStats ? "animate-pulse" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                        <StatIcon size={18} weight="bold" className="text-white" />
                      </div>
                      <p className="text-[11px] uppercase tracking-wider text-white/60 font-bold leading-none">
                        {stat.label.replace("NFTs ", "NFTS ")}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-white leading-none ml-10">{stat.value}</p>
                  </div>
                );
              })}
            </div>
            
            {Object.values(statsError).some(Boolean) && !loadingStats && (
              <p className="text-xs text-red-300 text-center">
                Some stats failed to load. Try again later.
              </p>
            )}
            
            {/* Enter Referral Code - inside Wallet Stats section */}
            <div className="pt-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <ManualReferCodeBind address={address} />
              </div>
            </div>
          </div>
          </section>
        )}

        {/* FAQ SECTION - ALWAYS VISIBLE */}
        <section className="app-panel">
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
                    aria-label={`Toggle ${faq.question}`}
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
