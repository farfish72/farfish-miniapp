"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { detectFarcasterEnvironment } from "../utils/farcaster";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { AppIcon } from "./ui";

const pageLabels: Record<string, string> = {
  "Home": "Overview",
  "Chest": "Rewards",
  "Stake": "Staking",
  "Rank": "Leaderboard",
  "Profile": "Account",
  "Game": "Game"
};

export default function Header({ title }: { title: string }) {
  const [isFarcaster, setIsFarcaster] = useState(true);

  useEffect(() => {
    try {
      setIsFarcaster(detectFarcasterEnvironment());
    } catch {
      setIsFarcaster(false);
    }
  }, []);

  return (
    <header className="w-full border-b border-surface bg-surface px-page pb-4 rounded-xl">
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col">
          <Image
            src="/farfish-logo.png"
            alt="FarFISH"
            width={40}
            height={40}
            className="rounded-control object-cover"
          />
        </div>

        <Link
          href="https://farfish.xyz"
          target="_blank"
          className="app-control inline-flex items-center gap-1 border border-muted text-xs font-semibold text-white transition-colors hover:border-accent hover:text-accent"
        >
          Find us
          <AppIcon icon={ArrowSquareOut} size="sm" weight="bold" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">{pageLabels[title] || title}</h2>
          <p className="mt-1 text-xs text-muted">
            {title === "Home" && "Start your daily habit"}
            {title === "Chest" && "Check in & collect"}
            {title === "Stake" && "Lock NFTs, grow yield"}
            {title === "Rank" && "How you stack up"}
            {title === "Profile" && "Your identity & stats"}
            {title === "Game" && "Play & win"}
          </p>
        </div>
      </div>
    </header>
  );
}
