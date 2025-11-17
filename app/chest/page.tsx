// app/chest/page.tsx
import React from "react";

export default function ChestPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      {/* NOTE: DO NOT put <Header /> here — layout already renders it */}

      {/* --- Top notice / summary --- */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-white">Next reward claim will be available on</h2>
        <p className="text-sm text-white/70 mt-1">Claim & NFT staking rewards open for everyone on that date. No action required now — connect your wallet on claim day to collect rewards.</p>
      </div>

      {/* --- Daily Spin (or Check-in) --- */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-xl font-bold">Daily Spin</h3>
        <p className="text-sm text-white/70 mt-1">One spin every 24 hours</p>

        <div className="mt-4 text-3xl font-extrabold">2.50 FRH <span className="text-base font-normal"> (example prize)</span></div>
        <div className="mt-2 text-sm text-white/70">Next spin: 23h 59m 39s</div>
        <div className="mt-2 text-sm text-white/70">Activity balance: 0.77 FRH</div>

        {/* Action (if spin enabled) */}
        <div className="mt-4 flex gap-3">
          <button className="px-5 py-2 rounded-full bg-emerald-400 text-black font-medium" disabled>
            Spin now (disabled)
          </button>
          <button className="px-4 py-2 rounded-full bg-white/5 text-white/80" disabled>
            Info
          </button>
        </div>
      </section>

      {/* --- Activity Rewards (previously 'Claim Rewards') --- */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-xl font-bold">Activity Rewards</h3>
        <p className="text-sm text-white/70 mt-1">Pending from spins & actions</p>

        <div className="mt-4 text-3xl font-extrabold">0.77 FRH</div>
        <div className="mt-2 text-sm text-white/70">Claim available from Sat Dec 20 2025</div>

        <div className="mt-4 flex justify-end">
          {/* locked button style */}
          <button className="px-5 py-2 rounded-full bg-white/10 text-white/50 cursor-not-allowed" disabled>
            Claim (locked)
          </button>
        </div>
      </section>

      {/* --- NFT Staking Rewards --- */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-xl font-bold">NFT Staking Rewards</h3>
        <p className="text-sm text-white/70 mt-1">Rewards from staked NFTs</p>

        <div className="mt-4 text-2xl font-semibold">4.20 FRH</div>
        <div className="mt-2 text-sm text-white/70">Claim available from Sat Dec 20 2025</div>

        <div className="mt-4 flex justify-end">
          <button className="px-5 py-2 rounded-full bg-emerald-500 text-black font-medium">
            Claim
          </button>
        </div>
      </section>

      {/* --- Footer note --- */}
      <footer className="text-center text-xs text-white/50 mt-6">
        FarFISH © All rights reserved
      </footer>
    </div>
  );
}
