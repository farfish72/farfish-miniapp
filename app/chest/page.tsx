// app/chest/page.tsx
"use client";

import React, { useState } from "react";

/**
 * Step 1 — Chest UI skeleton (mobile-first)
 * Paste this file to: app/chest/page.tsx
 * Tailwind required.
 */

type ChestType = "bronze" | "silver" | "gold";

function ChestBadge({ type }: { type: ChestType }) {
  if (type === "bronze")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300">Bronze</span>;
  if (type === "silver")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200/6 text-slate-200">Silver</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-300/10 text-yellow-200">Gold</span>;
}

function ChestIcon({ type }: { type: ChestType }) {
  const base = "w-12 h-12 rounded-lg flex items-center justify-center";
  if (type === "bronze") return <div className={base + " bg-amber-600/20 text-amber-300"}>🪙</div>;
  if (type === "silver") return <div className={base + " bg-slate-700/30 text-slate-100"}>🪝</div>;
  return <div className={base + " bg-yellow-700/20 text-yellow-200"}>💎</div>;
}

export default function ChestPage() {
  // UI-state (mock)
  const [walletConnected] = useState<boolean>(false); // later replace with real wallet state
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [activeChest, setActiveChest] = useState<ChestType | null>(null);

  function onOpenChest(type: ChestType) {
    // Step1: just show modal skeleton
    setActiveChest(type);
    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    setActiveChest(null);
  }

  return (
    <main className="min-h-screen bg-[#04121a] text-white px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-extrabold">Fishing Loot Chest</h1>
          <p className="text-sm text-white/70 mt-1">Daily rewards, stake chests and seasonal grand drops.</p>
        </header>

        {/* Streak / quick stats */}
        <section className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#08333f] to-[#03202a] flex items-center justify-center text-white/90">
              🔥
            </div>
            <div>
              <div className="text-sm font-semibold">Fishing Streak</div>
              <div className="text-xs text-white/60">Day 4 — +2% bonus</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/60">Next Grand Drop</div>
            <div className="text-sm font-medium">In 23 days</div>
          </div>
        </section>

        {/* Chest cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          {/* Bronze (Daily) */}
          <article className="bg-white/4 rounded-2xl p-4 flex flex-col items-stretch">
            <div className="flex items-center gap-3">
              <ChestIcon type="bronze" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Daily Bronze Chest</h3>
                  <ChestBadge type="bronze" />
                </div>
                <p className="text-xs text-white/60 mt-1">Free daily chest — no stake required.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/60">
                Cooldown: <span className="font-medium">24h</span>
              </div>

              <button
                onClick={() => onOpenChest("bronze")}
                className="ml-3 px-3 py-2 rounded-md bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black text-sm font-semibold"
              >
                Open
              </button>
            </div>
          </article>

          {/* Silver (Stake) */}
          <article className="bg-white/4 rounded-2xl p-4 flex flex-col items-stretch">
            <div className="flex items-center gap-3">
              <ChestIcon type="silver" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Stake Chest (Silver)</h3>
                  <ChestBadge type="silver" />
                </div>
                <p className="text-xs text-white/60 mt-1">Requires 1+ staked NFT — better rewards.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/60">
                Eligible: <span className="font-medium">Staked users</span>
              </div>

              <button
                onClick={() => (walletConnected ? onOpenChest("silver") : alert("Stake an NFT to unlock Silver chest"))}
                className="ml-3 px-3 py-2 rounded-md bg-white/10 text-sm font-semibold"
              >
                {walletConnected ? "Open (24h)" : "Locked"}
              </button>
            </div>
          </article>

          {/* Gold (Grand) */}
          <article className="bg-white/4 rounded-2xl p-4 flex flex-col items-stretch">
            <div className="flex items-center gap-3">
              <ChestIcon type="gold" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Grand Chest (Gold)</h3>
                  <ChestBadge type="gold" />
                </div>
                <p className="text-xs text-white/60 mt-1">Seasonal grand drop — top-tier rewards every 30 days.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-white/60">
                Next: <span className="font-medium">30 days</span>
              </div>

              <button
                onClick={() => alert("Gold chest distributes at season end — claim window opens automatically")}
                className="ml-3 px-3 py-2 rounded-md bg-white/10 text-sm font-semibold"
              >
                Info
              </button>
            </div>
          </article>
        </section>

        {/* History / info (placeholder) */}
        <section className="bg-white/4 rounded-2xl p-4 mb-6">
          <h4 className="text-sm font-semibold">Recent Claims</h4>
          <div className="mt-3 text-xs text-white/60">No claims yet (demo)</div>
        </section>

        <footer className="text-center text-xs text-white/60">
          Tip: staking increases rewards — stake your FarFISH to level up.
        </footer>
      </div>

      {/* Modal skeleton — Step1: visual only */}
      {openModal && activeChest && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md bg-[#061922] rounded-2xl p-5 border border-white/6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Opening {activeChest.toUpperCase()} Chest</h3>
              <button onClick={closeModal} className="text-xs text-white/60">Close</button>
            </div>

            <div className="h-44 rounded-lg bg-slate-800 flex items-center justify-center mb-4">
              {/* placeholder animation area */}
              <div className="text-sm text-white/60">Chest animation placeholder</div>
            </div>

            <div className="text-sm text-white/70">
              Reward preview (demo). Real reward logic & secure distribution will be added in Step 4.
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={closeModal} className="flex-1 px-4 py-2 rounded bg-white/10 font-semibold">Close</button>
              <button onClick={() => { alert("Demo reward: +5 FISH (mock)"); closeModal(); }} className="px-4 py-2 rounded bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-semibold">
                Claim (demo)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

