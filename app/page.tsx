"use client";

export default function Home() {
  return (
    <main className="min-h-screen w-full flex justify-center bg-[#04121a] text-white p-4">
      <div className="w-full max-w-md">

        {/* HEADER */}
    
        {/* SLOGAN */}
        <p className="text-center text-teal-300 text-sm mb-4">
          Mint. Stake. Earn. Dominate the Seas.
        </p>

        {/* MINT CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Mint FarFISH NFTs</h2>
              <p className="text-xs text-white/60">
                Total supply: 9999 • Phase 1: 5000 • Reserved: 20
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Price</p>
              <p className="text-lg font-bold">0.00375 ETH</p>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <p className="text-xs text-white/60">Minted</p>
              <p className="font-bold">15</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Progress</p>
              <p className="font-bold">0.15%</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Remaining</p>
              <p className="font-bold">9984</p>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] w-[0.15%]"></div>
          </div>

          {/* MINT BUTTON */}
          <button className="w-full mt-4 bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg">
            Connect & Mint
          </button>

          {/* SHARE BUTTON */}
          <button className="w-full mt-2 bg-white/10 text-white py-2 rounded-lg text-sm">
            Share
          </button>

          <p className="text-xs text-white/60 mt-2">
            Note: 20 NFTs are reserved for team/partners.
          </p>
        </div>

        {/* WHY MINT */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Why mint a FarFISH?</h3>
          <ul className="text-sm text-white/70 space-y-1 pl-4">
            <li>• Staking rewards (30/90/180/360 days)</li>
            <li>• Tier system & exclusive drops</li>
            <li>• Limited editions</li>
          </ul>
        </div>

        {/* COLLECTION PREVIEW */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Collection Preview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              <img src="/fish1.jpg" alt="Artwork 1" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/10 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              <img src="/fish2.jpg" alt="Artwork 2" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/10 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              <img src="/fish3.jpg" alt="Artwork 3" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/10 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              <img src="/fish4.jpg" alt="Artwork 4" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="text-center text-xs text-white/50 mt-4 mb-6">
          FarFISH © All rights reserved
        </footer>

      </div>
    </main>
  );
}
