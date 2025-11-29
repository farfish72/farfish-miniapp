"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import useUser from "../hooks/useUser";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { supabase } from "../lib/supabase";

// Type definition for leaderboard entries (ready for backend integration)
type LeaderboardEntry = {
  rank: number;
  walletAddress: string;
  displayName?: string;
  pfpUrl?: string;
  totalPoints: number; // FRH Score from chests, staking, etc.
  fid?: number;
};

const useLeaderboardData = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("wallet_address, display_name, pfp_url, frh_score, fid")
          .order("frh_score", { ascending: false })
          .limit(100);
        const mapped: LeaderboardEntry[] = (data ?? []).map((row: any, idx: number) => ({
          rank: idx + 1,
          walletAddress: row.wallet_address,
          displayName: row.display_name ?? undefined,
          pfpUrl: row.pfp_url ?? undefined,
          totalPoints: Number(row.frh_score ?? 0),
          fid: row.fid ?? undefined,
        }));
        setEntries(mapped);
      } catch {
        setEntries([]);
      }
    })();
  }, []);
  return entries;
};

// Format large numbers with commas
const formatScore = (score: number): string => {
  return score.toLocaleString("en-US");
};

// Get rank badge styling
const getRankBadgeStyle = (rank: number) => {
  if (rank === 1) {
    return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black font-extrabold shadow-lg shadow-yellow-500/50";
  }
  if (rank === 2) {
    return "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-black font-extrabold shadow-lg shadow-gray-400/50";
  }
  if (rank === 3) {
    return "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white font-extrabold shadow-lg shadow-amber-600/50";
  }
  return "bg-white/10 text-white/80 font-semibold";
};

// Get row background styling for top 3
const getRowStyle = (rank: number) => {
  if (rank === 1) {
    return "border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent";
  }
  if (rank === 2) {
    return "border-gray-400/30 bg-gradient-to-r from-gray-400/5 to-transparent";
  }
  if (rank === 3) {
    return "border-amber-600/30 bg-gradient-to-r from-amber-600/5 to-transparent";
  }
  return "border-white/10 bg-white/5";
};

// Shorten wallet address
const shortenAddress = (address: string): string => {
  if (!address) return "0x0000...0000";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LeaderboardPage() {
  const { user } = useUser();

  useFarcasterEnvironment("Rank page");
  
  const leaderboardData = useLeaderboardData();
  
  const currentUserScore = useMemo(() => {
    if (!user) return 0;
    const nftPoints = (user.stats?.nftsOwned ?? 0) * 100;
    const stakedPoints = (user.stats?.staked ?? 0) * 500;
    const streakPoints = (user.stats?.streakDays ?? 0) * 50;
    return nftPoints + stakedPoints + streakPoints;
  }, [user]);
  
  const currentUserRank = useMemo(() => {
    const userRank = leaderboardData.findIndex(
      (entry) => entry.walletAddress.toLowerCase() === user?.walletAddress?.toLowerCase()
    );
    if (userRank !== -1) return userRank + 1;
    const usersAbove = leaderboardData.filter((entry) => entry.totalPoints > currentUserScore).length;
    return usersAbove + 1;
  }, [leaderboardData, user, currentUserScore]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Rank" />

      <div className="mt-4 flex-1 flex flex-col">
        {/* Header Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] bg-clip-text text-transparent">
            Real-time Leaderboard
          </h2>
          <p className="text-sm text-white/70 mt-1">
            Top 100 fishers ranked by FRH Score. Final rewards flow to top wallets when the airdrop snapshot happens.
          </p>
        </section>

        {/* Scrollable Leaderboard List */}
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {leaderboardData.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/10 ${getRowStyle(entry.rank)}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getRankBadgeStyle(entry.rank)}`}>
                  <span className="text-sm">{entry.rank}</span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {entry.pfpUrl && (
                    <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/20">
                      <Image
                        src={entry.pfpUrl}
                        alt={entry.displayName || "User"}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {entry.displayName || shortenAddress(entry.walletAddress)}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {entry.displayName ? shortenAddress(entry.walletAddress) : `FID: ${entry.fid || "—"}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* FRH Score */}
              <div className="ml-4 shrink-0 text-right">
                <p className="text-sm font-bold text-[#00d4c4]">
                  {formatScore(entry.totalPoints)}
                </p>
                <p className="text-xs text-white/50">FRH</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-4">
          <h3 className="font-semibold text-lg mb-2">How to climb</h3>
          <ul className="space-y-1.5 text-sm text-white/70">
            <li>• Stake NFTs for longer periods to earn multipliers</li>
            <li>• Maintain daily chest streaks to avoid decay</li>
            <li>• Complete quests in the activity feed for bonus points</li>
            <li>• Higher rarity NFTs earn more FRH when staked</li>
          </ul>
        </section>
      </div>

      {/* Sticky Current User Row - Always visible at bottom */}
      {user && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40">
          <div className="bg-gradient-to-r from-[#00d4c4]/20 via-[#3be6c1]/20 to-[#80ffd1]/20 border-2 border-[#00d4c4]/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getRankBadgeStyle(currentUserRank)}`}>
                  <span className="text-base font-bold">{currentUserRank}</span>
                </div>

                {/* User Avatar */}
                <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border-2 border-[#00d4c4]">
                  <Image
                    src={user.pfpUrl || "/farfish-logo.png"}
                    alt={user.displayName || "You"}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">YOU</p>
                  <p className="text-xs text-white/70 truncate">
                    {user.displayName || shortenAddress(user.walletAddress)}
                  </p>
                </div>
              </div>

              {/* FRH Score - Prominently displayed */}
              <div className="ml-4 shrink-0 text-right">
                <p className="text-lg font-extrabold text-[#00d4c4]">
                  {formatScore(currentUserScore)}
                </p>
                <p className="text-xs font-semibold text-white/80">FRH Score</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}