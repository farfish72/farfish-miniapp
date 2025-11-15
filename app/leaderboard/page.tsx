"use client";
import Header from "../components/Header";
import Leaderboard from "../components/Leaderboard";

const sample = [
  { rank:1, address:"0xAbCd0123...789", stakedCount:12 },
  { rank:2, address:"0xEFGf456...012", stakedCount:7 },
  { rank:3, address:"0xHIJk789...345", stakedCount:3 },
  { rank:4, address:"0xXYZ...111", stakedCount:2 },
];

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen p-4">
      <Header />
      <h2 className="text-xl font-semibold mb-3">Leaderboard</h2>

      <Leaderboard entries={sample} />
    </main>
  );
}
