// app/leaderboard/page.tsx
"use client";

export default function LeaderboardPage() {
  const rows = [
    { rank: 1, name: "Alpha", score: "12,400" },
    { rank: 2, name: "Beta", score: "9,800" },
    { rank: 3, name: "Gamma", score: "6,300" },
    { rank: 4, name: "You", score: "—" },
  ];

  return (
    <main className="min-h-screen w-full flex justify-center bg-[#04121a] text-white p-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">FarFISH</h1>
            <p className="text-sm text-white/70">Leaderboard</p>
          </div>
        </header>

        {/* LEADERBOARD CARD */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-lg font-bold mb-2">Top Fishers</h2>
          <p className="text-sm text-white/70 mb-3">Unique ranking UI — rewards will be assigned to top ranks.</p>

          <ol className="space-y-2">
            {rows.map((r) => (
              <li key={r.rank} className="flex items-center justify-between bg-white/6 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-semibold">{r.rank}</div>
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-white/60">Details</div>
                  </div>
                </div>
                <div className="font-semibold">{r.score}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* INFO */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-2">How it works</h3>
          <p className="text-sm text-white/70">Leaderboard driven by staking & activity. Unique titles & rewards for top users.</p>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-white/50 mt-4">
          FarFISH © All rights reserved
        </footer>
      </div>
    </main>
  );
}