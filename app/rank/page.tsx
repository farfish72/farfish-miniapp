"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

type LeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals_count: number;
  rewards: number; // Referrals × 20 FRH
};

type ToastState = { type: "error" | "success"; message: string } | null;

const getUsername = (address: string): string => {
  if (!address) return "0x0000";
  return address.slice(-8).toLowerCase();
};

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useFarcasterEnvironment("Rank page");

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load leaderboard");
      }
      const data = (await res.json()) as any[];
      
      // Transform data: rewards = referrals × 20 FRH (referral-based only)
      const transformed: LeaderboardEntry[] = data.map((entry) => ({
        rank: entry.rank || 0,
        wallet: entry.wallet || "",
        referrals_count: entry.referrals_count || 0,
        rewards: (entry.referrals_count || 0) * 20, // Referrals × 20 FRH
      }));
      
      setEntries(transformed);

      // Fetch user's own rank if connected
      if (address) {
        try {
          const userRes = await fetch(`/api/leaderboard/user?wallet=${address}`, { cache: "no-store" });
          if (userRes.ok) {
            const userData = await userRes.json();
            const userEntry: LeaderboardEntry = {
              rank: userData.rank || 0,
              wallet: userData.wallet || address,
              referrals_count: userData.referrals_count || 0,
              rewards: (userData.referrals_count || 0) * 20, // Referrals × 20 FRH
            };
            setUserEntry(userEntry);
          }
        } catch (error) {
          console.error("Failed to fetch user rank:", error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
      setToast({ type: "error", message: "Could not load leaderboard. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [address]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Rank" />

      <div className="mt-4 flex-1 flex flex-col space-y-4">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] bg-clip-text text-transparent">
                Leaderboard
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchLeaderboard}
              disabled={loading}
              className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 transition disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <p className="text-sm text-white/70 mb-4">
            NFT rarity may boost your final rewards at distribution.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/60">
                  <th className="py-2 pr-3">Rank</th>
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Referrals</th>
                  <th className="py-2">Rewards (FRH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-white/60 animate-pulse">
                      Loading leaderboard…
                    </td>
                  </tr>
                )}
                {!loading && entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-white/60">
                      No referrals yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  entries.map((entry) => {
                    const isUser = address && entry.wallet.toLowerCase() === address.toLowerCase();
                    return (
                      <tr 
                        key={entry.rank} 
                        className={`hover:bg-white/5 transition ${isUser ? "bg-[#00d4c4]/10" : ""}`}
                      >
                        <td className="py-2 pr-3 font-semibold">{entry.rank}</td>
                        <td className="py-2 pr-3 font-mono">{getUsername(entry.wallet)}</td>
                        <td className="py-2 pr-3">{entry.referrals_count}</td>
                        <td className="py-2">{entry.rewards}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Show user's own rank if outside top 100 */}
          {userEntry && !entries.find((e) => e.wallet.toLowerCase() === address?.toLowerCase()) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold mb-2 text-white/80">You</h3>
              <div className="rounded-lg border border-[#00d4c4]/30 bg-[#00d4c4]/5 p-3">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Rank</p>
                    <p className="font-semibold">#{userEntry.rank}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Username</p>
                    <p className="font-mono">{getUsername(userEntry.wallet)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Referrals</p>
                    <p>{userEntry.referrals_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Rewards (FRH)</p>
                    <p>{userEntry.rewards}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
