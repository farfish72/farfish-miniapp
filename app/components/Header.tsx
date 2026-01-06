"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { detectFarcasterEnvironment } from "../utils/farcaster";

const pageEmojis: Record<string, string> = {
  "Home": "🏠",
  "Chest": "💎",
  "Stake": "🔒",
  "Steam": "⚡",
  "Rank": "🏆",
  "Profile": "👤",
  "Game": "🎮"
};

const pageGradients: Record<string, string> = {
  "Home": "from-blue-500 to-cyan-500",
  "Chest": "from-amber-500 to-orange-500",
  "Stake": "from-green-500 to-emerald-500",
  "Steam": "from-purple-500 to-pink-500",
  "Rank": "from-yellow-500 to-amber-500",
  "Profile": "from-purple-500 to-pink-500",
  "Game": "from-red-500 to-pink-500"
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

  const emoji = pageEmojis[title] || "🐟";
  const gradient = pageGradients[title] || "from-blue-500 to-cyan-500";

  return (
    <div className="w-full px-4 pt-4 pb-6">
      {/* Top section with app name and follow button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            FarFISH
          </h1>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/60">Active on Base</span>
          </div>
        </div>

        <Link
          href="https://warpcast.com/farf"
          target="_blank"
          className="relative overflow-hidden bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
        >
          <span className="relative z-10 text-sm font-medium text-white">
            Follow
          </span>
        </Link>
      </div>

      {/* Positioning message */}
      <div className="mb-4">
        <p className="text-sm text-white/80 text-center">
          Build daily habits, earn rewards on Base
        </p>
      </div>

      {/* Page title with emoji and gradient */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-${gradient.split(' ')[1]}/25`}>
          <span className="text-xl">{emoji}</span>
        </div>
        <div>
          <h2 className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {title}
          </h2>
          <p className="text-sm text-white/60">
            {title === "Home" && "Start your daily habit"}
            {title === "Chest" && "Claim daily rewards"}
            {title === "Stake" && "Lock & earn more"}
            {title === "Steam" && "Complete tasks to earn FRH"}
            {title === "Rank" && "See your progress"}
            {title === "Profile" && "Track your activity"}
            {title === "Game" && "Play & win"}
          </p>
        </div>
      </div>
    </div>
  );
}
