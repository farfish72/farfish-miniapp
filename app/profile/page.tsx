// app/profile/page.tsx
"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import WalletConnect from "../components/WalletConnect";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { FARCASTER_PROFILE_URL, X_PROFILE_URL, referralMultiplierByTokenId } from "../constants";
import { supabase } from "../lib/supabase";
import useFarcasterGate from "../hooks/useFarcasterGate";

const faqItems = [
  {
    question: "What is FarFish?",
    answer:
      "FarFish is the first GameFi & Utility project built natively for Farcaster on the Base chain. Stake NFTs, open Chests, and climb the leaderboards!",
  },
  {
    question: "How do I earn rewards?",
    answer:
      "Stake your FarFish NFTs in the 'Stake' tab. Higher tier NFTs (Rare, Epic, Legendary) earn significantly more daily token rewards.",
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

export default function ProfilePage() {
  const { user } = useUser();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [referralsCompleted, setReferralsCompleted] = useState<number>(0);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const { blocked, message } = useFarcasterGate();
  const [refMultiplier, setRefMultiplier] = useState<number | null>(null);
  const [multiplierStatus, setMultiplierStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [resolvedFid, setResolvedFid] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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

  useEffect(() => {
    const wallet = user?.walletAddress;
    if (!wallet) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referrals_completed")
        .eq("wallet_address", wallet)
        .limit(1)
        .single();
      setReferralsCompleted((data as any)?.referrals_completed ?? 0);
    })();
  }, [user?.walletAddress]);

  // Resolve FID from existing Farcaster/SIWF context or Supabase profile as fallback
  useEffect(() => {
    const directFid = user?.fid;
    if (directFid) {
      setResolvedFid(String(directFid));
      return;
    }

    const wallet = user?.walletAddress;
    if (!wallet) {
      setResolvedFid(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("fid")
          .eq("wallet_address", wallet)
          .maybeSingle();

        if (cancelled) return;
        setResolvedFid(data?.fid ? String((data as any).fid) : null);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to resolve FID from profile", error);
          setResolvedFid(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.fid, user?.walletAddress]);

  const multiplierCopy = useMemo(() => {
    if (!user?.walletAddress) return "Connect wallet to unlock multipliers";
    if (multiplierStatus === "loading") return "Loading multiplier...";
    if (multiplierStatus === "error") return "Multiplier unavailable";
    if (refMultiplier === null) return "Loading multiplier...";
    return `x${refMultiplier}`;
  }, [user?.walletAddress, multiplierStatus, refMultiplier]);

  const handleVerifyAndGetLink = () => {
    const baseUrl = "https://farfish-miniapp5.vercel.app";
    const fid = resolvedFid;
    if (fid) {
      const link = `${baseUrl}/share?ref=${fid}`;
      setReferralLink(link);
    }
  };

  const handleCopyReferralLink = async () => {
    const baseUrl = "https://farfish-miniapp5.vercel.app";
    const fid = resolvedFid;
    if (!fid) {
      return;
    }
    const link = `${baseUrl}/share?ref=${fid}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setReferralLink(link);
        setCopyToast("Referral link copied!");
        setTimeout(() => setCopyToast(null), 3000);
      }
    } catch (error) {
      console.error("Failed to copy referral link", error);
      setCopyToast("Failed to copy link");
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  // Auto-generate referral link if user has FID
  useEffect(() => {
    if (resolvedFid) {
      const baseUrl = "https://farfish-miniapp5.vercel.app";
      const link = `${baseUrl}/share?ref=${resolvedFid}`;
      setReferralLink(link);
    } else {
      setReferralLink(null);
    }
  }, [resolvedFid]);

  useEffect(() => {
    const wallet = user?.walletAddress;
    if (!wallet) {
      setRefMultiplier(null);
      setMultiplierStatus("idle");
      return;
    }

    let cancelled = false;
    setMultiplierStatus("loading");

    (async () => {
      try {
        const { data } = await supabase
          .from("staking_positions")
          .select("token_id, token_tier")
          .eq("wallet_address", wallet)
          .order("token_tier", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        const tokenId = Number((data as any)?.token_id);
        const fallbackTier = Number((data as any)?.token_tier ?? 0);
        const resolvedId = Number.isFinite(tokenId) ? tokenId : fallbackTier;
        setRefMultiplier(referralMultiplierByTokenId(resolvedId));
        setMultiplierStatus("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load referral multiplier", error);
          setRefMultiplier(null);
          setMultiplierStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.walletAddress]);

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
                alt={user?.displayName ?? "FarFISH user"}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {user?.displayName ?? "FarFISH Captain"}
              </p>
              <p className="text-xs text-white/60">
                {shortenAddress(user?.walletAddress)} • FID:{" "}
                {resolvedFid ?? "FID not available"}
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
            Base reward: 10 FRH per referral. Current multiplier: {multiplierCopy} (based on highest staked NFT token
            ID).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 text-center"
            >
              Follow on X
            </a>
            <a
              href={FARCASTER_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 text-center"
            >
              Follow on Farcaster
            </a>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleVerifyAndGetLink}
              className="w-full rounded-lg bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] py-2 text-sm font-semibold text-black"
            >
              Verify & Get Link
            </button>
          </div>
          {resolvedFid && referralLink && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-white/70 break-all">Your referral link: {referralLink}</p>
              <button
                type="button"
                onClick={handleCopyReferralLink}
                className="w-full rounded-lg bg-white/10 border border-white/10 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 transition"
              >
                Copy Referral Link
              </button>
              {copyToast && (
                <p className="text-xs text-green-400 text-center">{copyToast}</p>
              )}
            </div>
          )}
          <div className="mt-3 space-y-1">
            <p className="text-sm">Referrals completed: {referralsCompleted}</p>
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
    </div>
  );
}
