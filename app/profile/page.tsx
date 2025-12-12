// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback } from "react";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { FARCASTER_PROFILE_URL } from "../constants";
import useFarcasterGate from "../hooks/useFarcasterGate";
import { REFERRAL_APP_URL } from "../config/referral";

type ToastState = { type: "error" | "success"; message: string } | null;

type ReferralState = {
  bound: boolean;
  referrer?: string;
  link?: string;
  referralsCount: number;
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

export default function ProfilePage() {
  const { user } = useUser();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [referralState, setReferralState] = useState<ReferralState>({ bound: false, referralsCount: 0 });
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const { blocked, message } = useFarcasterGate();

  // Farcaster detection
  useFarcasterEnvironment("Profile page");

  const stats = useMemo(
    () => [
      {
        label: "NFTs owned",
        value: formatStatValue(user?.stats?.nftsOwned),
      },
      {
        label: "Staked",
        value: formatStatValue(user?.stats?.staked),
      },
      {
        label: "Chest streak",
        value: formatStatValue(user?.stats?.streakDays, " days"),
      },
      {
        label: "Rank",
        value: user?.stats?.rankLabel ?? "Unranked",
      },
    ],
    [user?.stats]
  );

  const showToast = useCallback(
    (type: "error" | "success", msg: string) => setToast({ type, message: msg }),
    []
  );

  const createReferralLink = useCallback((wallet: string) => {
    const refCode = wallet.slice(-6).toLowerCase();
    return `${REFERRAL_APP_URL}?ref=${refCode}`;
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Profile" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
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
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
              >
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-2">Refer & Earn</h3>
          <p className="text-sm text-white/70">
            Complete tasks to verify referrals. Share your link to earn referral rewards.
          </p>
          <div className="mt-3 space-y-2">
            <a
              href={FARCASTER_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 text-center block"
            >
              Follow on Farcaster
            </a>
            <a
              href="https://farcaster.xyz/farf/0x2dc370c3"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 text-center block"
            >
              Like & Recast
            </a>
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
                  <p className="text-xs text-white/70 break-all">
                    Your referral link: {referralState.link ?? createReferralLink(user.walletAddress)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className="rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 transition"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchReferralInfo(user.walletAddress!)}
                      className="rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 transition"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                <p className="text-sm">Referrals completed: {referralState.referralsCount ?? 0}</p>
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
