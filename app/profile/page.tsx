// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ConnectWallet } from "@thirdweb-dev/react";
import Header from "../components/Header";
import useUser from "../hooks/useUser";

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Profile" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex justify-end">
            <ConnectWallet />
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
                FID: {user?.fid ?? "—"} • {shortenAddress(user?.walletAddress)}
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