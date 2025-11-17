// app/staking/page.tsx
"use client";

export default function StakingPage() {
  return (
    <main className="min-h-screen w-full flex justify-center bg-[#04121a] text-white p-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">FarFISH</h1>
            <p className="text-sm text-white/70">NFT Staking</p>
          </div>
        </header>

        {/* STAKING CARD */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h2 className="text-lg font-bold mb-2">Stake your NFT</h2>
          <p className="text-sm text-white/70 mb-3">Choose lock period and stake to earn FRH rewards. (Demo UI)</p>

          <div className="space-y-3">
            <div className="bg-white/6 rounded-lg p-3">
              <div className="text-xs text-white/60">Selected NFT</div>
              <div className="font-semibold mt-1">No NFT selected (demo)</div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-white/10 py-2 rounded-lg">Lock 30 days</button>
              <button className="flex-1 bg-white/10 py-2 rounded-lg">Lock 90 days</button>
            </div>

            <div className="bg-white/6 rounded-lg p-3 text-sm text-white/70">
              Estimated reward: <strong>0.00 FRH</strong> (demo)
            </div>

            <button className="w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg">Stake (demo)</button>
          </div>
        </section>

        {/* STAKED ASSETS */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-2">Your Staked NFTs</h3>
          <div className="text-sm text-white/70">No staked NFTs yet (demo).</div>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-white/50 mt-4">
          FarFISH © All rights reserved
        </footer>
      </div>
    </main>
  );
}

