// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useAccount, useChainId, useConnect } from "wagmi";
import { useSearchParams, useRouter } from "next/navigation";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { base } from "viem/chains";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { NFT_CONTRACT_ADDRESS } from "../constants";
import useFarcasterGate from "../hooks/useFarcasterGate";
import nftDropAbi from "../abi/nftDrop.json";
import useUserStakes from "../hooks/useUserStakes";

type ToastState = { type: "error" | "success"; message: string } | null;

type LiveStats = {
  nftsOwned: number;
  chestStreak: number;
  rank: number | null;
};

const faqItems = [
  {
    question: "1. What is FarFISH?",
    answer: "FarFISH is an on-chain reward system on Base for Farcaster and Base App users. Everything is wallet based and verifiable.",
  },
  {
    question: "2. What is the Home page?",
    answer: "Your entry point. Mint NFT, unlock features and navigate the app.",
  },
  {
    question: "3. What is the Chest page?",
    answer: "Where daily rewards live. Claim FRH, check cooldowns and view your Trust Anchor.",
  },
  {
    question: "4. What is Trust Anchor?",
    answer: "A snapshot of your real activity streaks, holdings, rank and status. All on chain.",
  },
  {
    question: "5. What does the Stake page do?",
    answer: "Stake NFTs to unlock higher rewards and future benefits.",
  },
  {
    question: "6. What is the Stream page?",
    answer: "The FarFISH activity feed. Real interactions, real signals.",
  },
  {
    question: "7. How do I earn FRH?",
    answer: "Daily claims, NFT staking and real participation. No bots.",
  },
  {
    question: "8. How is Rank calculated?",
    answer: "Only by how much FRH you hold. Nothing else.",
  },
  {
    question: "9. What is on the Profile page?",
    answer: "Your wallet identity and basic stats. Detailed data lives in Trust Anchor.",
  },
  {
    question: "10. Is FarFISH safe?",
    answer: "Yes. It's non-custodial and onchain. You stay in control.",
  },
  {
    question: "11. When will FRH be listed?",
    answer: "Planned for Q1, 2026.",
  },
];

const formatStatValue = (value: number | string | undefined, suffix = "") => {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${value}${suffix}`;
};

const shortenAddress = (address?: string) => {
  if (!address) return "0x0000...0000";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

const TOKEN_IDS = Array.from({ length: 16 }, (_, i) => i); // 0-15

function ProfilePageContent() {
  const { user, loadingFarcaster } = useUser();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>({ nftsOwned: 0, chestStreak: 0, rank: null });
  const [loadingStats, setLoadingStats] = useState(false);
  const [nftInfo, setNftInfo] = useState<{ tokenId: number; uri: string } | null>(null);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [nftChecked, setNftChecked] = useState(false);
  const { blocked, message } = useFarcasterGate();
  const { stakes } = useUserStakes();

  const isBaseNetwork = chainId === base.id;
  const readEnabled = Boolean(isConnected && address && isBaseNetwork);

  // Farcaster detection
  useFarcasterEnvironment("Profile page");

  // Fetch NFT info when viewing NFT
  const fetchNFTInfo = useCallback(async () => {
    if (!address || !NFT_CONTRACT_ADDRESS) {
      setNftChecked(true);
      return;
    }

    setNftLoading(true);
    setNftError(null);
    setNftChecked(false);
    try {
      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      if (!publicClient) {
        setNftError("Network client unavailable");
        setNftChecked(true);
        return;
      }

      // Find which tokenId user owns
      let found = false;
      for (const id of TOKEN_IDS) {
        const balance = await (publicClient.readContract as any)({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: nftDropAbi as any,
          functionName: "balanceOf",
          args: [address as `0x${string}`, BigInt(id)],
        }) as bigint;

        if (balance > BigInt(0)) {
          try {
            const uri = await (publicClient.readContract as any)({
              address: NFT_CONTRACT_ADDRESS as `0x${string}`,
              abi: nftDropAbi as any,
              functionName: "uri",
              args: [BigInt(id)],
            }) as string;
            setNftInfo({ tokenId: id, uri });
            found = true;
            break;
          } catch {
            // Continue if URI fetch fails
          }
        }
      }

      if (!found) {
        setNftInfo(null);
      }
    } catch (error) {
      console.error("Failed to fetch NFT info:", error);
      setNftError("Failed to load NFT data");
    } finally {
      setNftLoading(false);
      setNftChecked(true);
    }
  }, [address]);

  // Check if redirected from Home with View NFT
  useEffect(() => {
    const viewNft = searchParams.get("viewNft");
    if (viewNft === "true" && address) {
      fetchNFTInfo();
    }
  }, [searchParams, address, fetchNFTInfo]);

  // Fetch live stats
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
      // Fetch NFT owned count (tokenId-based, ERC1155 balanceOf is valid here)
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

  // Fetch live stats when address changes or when explicitly refreshed (e.g. after stake/unstake/chest updates)
  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats]);

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

  const showToast = useCallback(
    (type: "error" | "success", msg: string) => setToast({ type, message: msg }),
    []
  );

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
        {/* NFT Info Section - shown when redirected from mint */}
        {(nftChecked || nftLoading || nftInfo) && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="text-lg font-semibold mb-2">Your NFT</h3>
            <div className="space-y-2">
              {nftLoading && (
                <p className="text-sm text-white/60 animate-pulse">Checking your FarFISH NFT…</p>
              )}
              {!nftLoading && nftError && (
                <p className="text-sm text-red-300">{nftError}</p>
              )}
              {!nftLoading && !nftError && nftInfo && (
                <>
                  <p className="text-sm text-white/70">Token ID: {nftInfo.tokenId}</p>
                  {nftInfo.uri && (
                    <a
                      href={nftInfo.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#00d4c4] hover:underline"
                    >
                      View on IPFS
                    </a>
                  )}
                </>
              )}
              {!nftLoading && !nftError && nftChecked && !nftInfo && (
                <p className="text-sm text-white/70">You don&apos;t own a FarFISH NFT yet.</p>
              )}
            </div>
          </section>
        )}

        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="space-y-3">
            {blocked ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-red-400">
                  {message}
                </div>
                <button
                  onClick={() => connect({ connector: farcasterMiniApp() })}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>
          <div className="flex items-start gap-4">
            {/* Profile Photo with top-right edit icon */}
            <div className="relative">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-white/20">
                <Image
                  src={user?.pfpUrl || localStorage.getItem('profileImage') || "/farfish-logo.png"}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  unoptimized
                />
                {/* Only show edit icon if no Farcaster profile or user wants to override */}
                {(!user?.farcasterProfile || localStorage.getItem('profileImage')) && (
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
                            // Force re-render to show new image
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
                )}
                
                {/* Farcaster badge */}
                {user?.farcasterProfile && (
                  <div className="absolute bottom-1 right-1 bg-purple-500 rounded-full p-1 border-2 border-white/90">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.2 12c0-6.2-5-11.2-11.2-11.2S.8 5.8.8 12s5 11.2 11.2 11.2S23.2 18.2 23.2 12zM12 20.8c-4.9 0-8.8-3.9-8.8-8.8S7.1 3.2 12 3.2s8.8 3.9 8.8 8.8-3.9 8.8-8.8 8.8z"/>
                      <path d="M12 6.4c-3.1 0-5.6 2.5-5.6 5.6s2.5 5.6 5.6 5.6 5.6-2.5 5.6-5.6-2.5-5.6-5.6-5.6zm0 9.6c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Username and Connected Wallet Label */}
            <div className="flex-1">
              <div className="flex items-center gap-2 group relative">
                <input
                  type="text"
                  className="text-2xl font-bold bg-transparent border-b-2 border-transparent focus:border-blue-400 focus:outline-none w-full pr-8"
                  defaultValue={user?.displayName || localStorage.getItem('username') || ''}
                  placeholder={user?.farcasterProfile ? user.displayName : "username"}
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
                {isConnected && address && (
                  <span className="text-sm font-medium text-white/60">Wallet connected</span>
                )}
                
                {/* Farcaster Profile Status */}
                {user?.farcasterProfile && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-xs text-purple-300">
                      @{user.farcasterProfile.username} • {user.farcasterProfile.followerCount} followers
                    </span>
                  </div>
                )}
                
                {address && !user?.farcasterProfile && !loadingStats && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-400">No Farcaster profile linked</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
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
            <p className="mt-2 text-xs text-red-300 text-center">
              Some stats failed to load. Try again later.
            </p>
          )}
        </section>

        {/* Farcaster Profile Section */}
        {user?.farcasterProfile && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white">Farcaster Profile</h3>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Username</p>
                  <p className="text-sm font-medium text-white">@{user.farcasterProfile.username}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">FID</p>
                  <p className="text-sm font-medium text-white">{user.farcasterProfile.fid}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Followers</p>
                  <p className="text-sm font-medium text-white">{user.farcasterProfile.followerCount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide">Following</p>
                  <p className="text-sm font-medium text-white">{user.farcasterProfile.followingCount?.toLocaleString()}</p>
                </div>
              </div>
              
              {user.farcasterProfile.bio && (
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wide mb-1">Bio</p>
                  <p className="text-sm text-white/80">{user.farcasterProfile.bio}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Loading Farcaster Profile */}
        {loadingFarcaster && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-purple-500/50 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-white/70">Loading Farcaster Profile...</h3>
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
          </section>
        )}

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
                    <span className="text-xl leading-none text-white/60">
                      {open ? "−" : "+"}
                    </span>
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
