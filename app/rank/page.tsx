"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

type LeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals_count: number;
  stake_score: number;
  score: number;
};

type ToastState = { type: "error" | "success"; message: string } | null;

const shortenAddress = (address: string): string => {
  if (!address) return "0x0000...0000";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
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
      const data = (await res.json()) as LeaderboardEntry[];
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
      setToast({ type: "error", message: "Could not load leaderboard. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] bg-clip-text text-transparent">
                Hybrid Leaderboard
              </h2>
              <p className="text-sm text-white/70 mt-1">
                Sorted by referrals (x10) plus staking rewards. Top 20 wallets shown.
              </p>
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

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/60">
                  <th className="py-2 pr-3">Rank</th>
                  <th className="py-2 pr-3">Wallet</th>
                  <th className="py-2 pr-3">Referrals</th>
                  <th className="py-2 pr-3">Stake Score</th>
                  <th className="py-2">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-white/60">
                      Loading leaderboard...
                    </td>
                  </tr>
                )}
                {!loading && entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-white/60">
                      No leaderboard data yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  entries.map((entry) => (
                    <tr key={entry.rank} className="hover:bg-white/5 transition">
                      <td className="py-2 pr-3 font-semibold">{entry.rank}</td>
                      <td className="py-2 pr-3">{shortenAddress(entry.wallet)}</td>
                      <td className="py-2 pr-3">{entry.referrals_count}</td>
                      <td className="py-2 pr-3">{entry.stake_score}</td>
                      <td className="py-2 font-bold text-[#00d4c4]">{entry.score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-lg mb-2">How scoring works</h3>
          <ul className="space-y-1.5 text-sm text-white/70">
            <li>• Referral score = total referrals × 10</li>
            <li>• Stake score = on-chain staking rewards from the contract</li>
            <li>• Total score = referral score + stake score</li>
            <li>• List refreshes via the button above</li>
          </ul>
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
