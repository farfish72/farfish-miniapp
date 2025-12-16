// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useAccount, useChainId } from "wagmi";
import { useSearchParams, useRouter } from "next/navigation";
import { base } from "viem/chains";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { FARCASTER_PROFILE_URL, NFT_CONTRACT_ADDRESS, STAKING_CONTRACT_ADDRESS } from "../constants";
import useFarcasterGate from "../hooks/useFarcasterGate";
import nftDropAbi from "../abi/nftDrop.json";
import stakeAbi from "../abi/stake.json";

type ToastState = { type: "error" | "success"; message: string } | null;

type ReferralState = {
  bound: boolean;
  referrer?: string;
  link?: string;
  referralsCount: number;
};

type TaskState = {
  followComplete: boolean;
  recastComplete: boolean;
} | null;

type LiveStats = {
  nftsOwned: number;
  stakedCount: number;
  chestStreak: number;
  rank: number | null;
};

const faqItems = [
  {
    question: "What is FarFish?",
    answer:
      "FarFish is the first GameFi & Utility project built natively for Farcaster on the Base chain. Stake NFTs, open Chests, and climb the leaderboards!",
  },
  {
    question: "How do I earn rewards?",
    answer:
      "Stake your FarFish NFTs in the 'Stake' tab. Different NFT types (Bluefin, GoldRay, RedSpike, ShadowGill) earn different reward amounts based on staking duration.",
  },
  {
    question: "What are Chests for?",
    answer:
      "Chests contain random rewards like tokens or points. Open them daily to maintain your streak and boost your profile rank.",
  },
  {
    question: "How do I get a FarFish NFT?",
    answer:
      "Mint during the official launch phase on the Home page. Secondary sales will be available on Base NFT marketplaces.",
  },
  {
    question: "Which network is this on?",
    answer:
      "FarFish is built entirely on the Base L2 network. You will need ETH on Base to pay for gas fees.",
  },
  {
    question: "Are the contracts safe?",
    answer:
      "Yes. Our smart contracts are verified, and team assets are secured using industry-standard Safe multi-sig wallets.",
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
  const { user } = useUser();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [referralState, setReferralState] = useState<ReferralState>({ bound: false, referralsCount: 0 });
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>({ nftsOwned: 0, stakedCount: 0, chestStreak: 0, rank: null });
  const [loadingStats, setLoadingStats] = useState(false);
  // Tasks are UX-only; we do not persist or verify completion
  const [taskState, setTaskState] = useState<TaskState>({ followComplete: false, recastComplete: false });
  const [nftInfo, setNftInfo] = useState<{ tokenId: number; uri: string } | null>(null);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [nftChecked, setNftChecked] = useState(false);
  const { blocked, message } = useFarcasterGate();

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
  type StatsErrorState = { nftsOwned: boolean; stakedCount: boolean; chestStreak: boolean; rank: boolean };
  const [statsError, setStatsError] = useState<StatsErrorState>({
    nftsOwned: false,
    stakedCount: false,
    chestStreak: false,
    rank: false,
  });
  const [statsRefreshToken, setStatsRefreshToken] = useState(0);

  const fetchLiveStats = useCallback(async () => {
    if (!address) {
      setLiveStats({ nftsOwned: 0, stakedCount: 0, chestStreak: 0, rank: null });
      setStatsError({ nftsOwned: false, stakedCount: false, chestStreak: false, rank: false });
      return;
    }

    setLoadingStats(true);
    setStatsError({ nftsOwned: false, stakedCount: false, chestStreak: false, rank: false });
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

      // Get staked count using the same pattern as the Stake page:
      // getUserStakeIds(address) then count active (not unstaked) positions.
      let stakedCount = 0;
      if (STAKING_CONTRACT_ADDRESS) {
        try {
          const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
          if (publicClient && address) {
            const stakeIds = (await (publicClient.readContract as any)({
              address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
              abi: stakeAbi as any,
              functionName: "getUserStakeIds",
              args: [address as `0x${string}`],
            })) as bigint[];

            if (Array.isArray(stakeIds) && stakeIds.length > 0) {
              const stakeInfos = await Promise.all(
                stakeIds.map(async (stakeId) => {
                  try {
                    const info = await (publicClient.readContract as any)({
                      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
                      abi: stakeAbi as any,
                      functionName: "getStakeInfo",
                      args: [stakeId],
                    });
                    return info as any[];
                  } catch {
                    return null;
                  }
                }),
              );

              stakedCount = stakeInfos.filter((info) => {
                if (!info || !Array.isArray(info) || info.length < 9) return false;
                const unstaked = Boolean(info[8]);
                return !unstaked;
              }).length;
            }
          }
        } catch (error) {
          console.error("Failed to fetch staked count:", error);
          setStatsError((prev) => ({ ...prev, stakedCount: true }));
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
          rank = Number(rankData?.rank ?? 0) || null;
        }
      } catch (error) {
        console.error("Failed to fetch rank:", error);
        setStatsError((prev) => ({ ...prev, rank: true }));
      }

      setLiveStats({ nftsOwned, stakedCount, chestStreak, rank });
    } catch (error) {
      console.error("Failed to fetch live stats:", error);
      setStatsError((prev) => ({
        nftsOwned: prev.nftsOwned || true,
        stakedCount: prev.stakedCount || true,
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

  // Tasks are UX-only engagement elements; no KV calls are made.

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
        value: loadingStats ? "…" : statsError.stakedCount ? "Error" : formatStatValue(liveStats.stakedCount),
      },
      {
        label: "Chest Streak",
        value: loadingStats ? "…" : statsError.chestStreak ? "Error" : formatStatValue(liveStats.chestStreak, " days"),
      },
      {
        label: "Rank",
        value: loadingStats ? "…" : statsError.rank ? "Error" : (liveStats.rank ? `#${liveStats.rank}` : "Unranked"),
      },
    ],
    [liveStats, loadingStats, statsError]
  );

  const followComplete = false;
  const recastComplete = false;
  const tasksLoading = false;

  // Task buttons only open destinations; they do not verify or persist state.
  const handleGoTask = useCallback(
    (taskType: "follow" | "recast") => {
      if (!address) {
        showToast("error", "Please connect your wallet");
        return;
      }

      if (taskType === "follow") {
        window.open(FARCASTER_PROFILE_URL, "_blank", "noopener,noreferrer");
      } else {
        window.open("https://farcaster.xyz/farf/0x2dc370c3", "_blank", "noopener,noreferrer");
      }
    },
    [address, showToast],
  );

  const createReferralLink = useCallback((wallet: string) => {
    const refCode = wallet.slice(-8).toLowerCase();
    return `https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish?ref=${refCode}`;
  }, []);

  const fetchReferralInfo = useCallback(
    async (wallet: string) => {
      if (!wallet) return;
      setLoadingReferral(true);
      try {
        const res = await fetch(`/api/referral/link?user=${wallet}`, {
          headers: { "x-user-wallet": wallet },
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load referral info");
        }
        const data = await res.json();
        const link = data?.link ?? createReferralLink(wallet);
        setReferralState({
          bound: Boolean(data?.bound),
          referrer: data?.referrer ?? undefined,
          link,
          referralsCount: Number(data?.referralsCount ?? 0),
        });
      } catch (error) {
        console.error("Failed to load referral info", error);
        showToast("error", "Failed to load referral info. Please try again.");
        setReferralState({
          bound: false,
          referrer: undefined,
          link: wallet ? createReferralLink(wallet) : undefined,
          referralsCount: 0,
        });
      } finally {
        setLoadingReferral(false);
      }
    },
    [createReferralLink, showToast]
  );

  const handleCopyReferralLink = async () => {
    if (!referralState.link) {
      showToast("error", "No referral link yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(referralState.link);
      showToast("success", "Referral link copied");
    } catch (error) {
      console.error("Failed to copy referral link", error);
      showToast("error", "Unable to copy link");
    }
  };

  useEffect(() => {
    if (user?.walletAddress) {
      fetchReferralInfo(user.walletAddress);
    } else {
      setReferralState({ bound: false, referrer: undefined, link: undefined, referralsCount: 0 });
    }
  }, [user?.walletAddress, fetchReferralInfo]);

  // Auto-scroll to Refer & Earn section when hash is present
  useEffect(() => {
    if (window.location.hash === "#refer-earn") {
      const element = document.getElementById("refer-earn");
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

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
          <div className="flex justify-end">
            {blocked ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-red-400">
                {message}
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>
          <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-white/10">
            <Image
              src={user?.pfpUrl ?? "/farfish-logo.png"}
              alt="FarFISH user"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>
            <div>
              <p className="text-lg font-semibold">
                FarFISH Captain
              </p>
              <p className="text-xs text-white/60">
                {shortenAddress(user?.walletAddress)}
              </p>
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

        <section id="refer-earn" className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-2">Refer & Earn</h3>
          <p className="text-sm text-white/70">
            Share your referral link to invite friends and grow the FarFISH community.
          </p>
          {tasksLoading && (
            <p className="text-xs text-white/60 mt-2">Loading task status...</p>
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between w-full rounded-lg bg-white/10 border border-white/10 py-2 px-3 gap-2">
              <span className="text-sm font-semibold text-white/80 flex-1">Follow on Farcaster</span>
              <div className="flex items-center gap-2">
                {!followComplete && !tasksLoading && (
                  <button
                    type="button"
                    onClick={() => handleGoTask("follow")}
                    className="rounded-lg bg-white/20 border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/30 transition"
                  >
                    Go
                  </button>
                )}
                {followComplete && <span className="text-green-400 text-lg">✔</span>}
              </div>
            </div>
            <div className="flex items-center justify-between w-full rounded-lg bg-white/10 border border-white/10 py-2 px-3 gap-2">
              <span className="text-sm font-semibold text-white/80 flex-1">Like & Recast</span>
              <div className="flex items-center gap-2">
                {!recastComplete && !tasksLoading && (
                  <button
                    type="button"
                    onClick={() => handleGoTask("recast")}
                    className="rounded-lg bg-white/20 border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/30 transition"
                  >
                    Go
                  </button>
                )}
                {recastComplete && <span className="text-green-400 text-lg">✔</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {!user?.walletAddress && (
              <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
                Connect your wallet to get your referral link.
              </div>
            )}

            {user?.walletAddress && (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-white/70 mb-2">
                    Your referral link:
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/90 font-mono break-all flex-1">
                      {referralState.link || createReferralLink(user.walletAddress)}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className="rounded-lg bg-white/10 border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 transition flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/80">
                  Referrals Completed: {referralState.referralsCount ?? 0}
                </p>
                <p className="text-sm text-white/70">
                  Every referral earns you 20 FRH. Rewards will be distributed on listing day.
                </p>
              </div>
            )}
          </div>
        </section>

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
