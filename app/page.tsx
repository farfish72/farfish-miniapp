// app/page.tsx
"use client";

import Image from "next/image";
import Header from "./components/Header";
import useFarcasterGate from "./hooks/useFarcasterGate";

export default function Home() {
  const { blocked, message } = useFarcasterGate();
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* উপরের FarFISH + Follow us + Home টাইটেল */}
      <Header title="Home" />

      {/* নিচে আসল হোম / মিন্ট কনটেন্ট */}
      <div className="mt-4 flex-1 flex flex-col">
        {/* MINT CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Mint FarFISH NFTs</h2>
              <p className="text-xs text-white/60">
                Total supply: 9999 • Reserved: 20
              </p>
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
            <div className="h-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] w-[15%]" />
          </div>

          {/* MINT BUTTON */}
          {blocked ? (
            <div className="w-full mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-center text-xs font-semibold text-red-400">
              {message}
            </div>
          ) : (
            <button className="w-full mt-4 bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg">
              Connect &amp; Mint
            </button>
          )}

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
            <li>• Tier system &amp; exclusive drops</li>
            <li>• Limited editions</li>
          </ul>
        </div>

        {/* COLLECTION PREVIEW */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Collection Preview</h3>
          <div className="grid grid-cols-2 gap-3">
            {["/fish1.jpg", "/fish2.jpg", "/fish3.jpg", "/fish4.jpg"].map(
              (src, idx) => (
                <div
                  key={src}
                  className="relative bg-white/10 rounded-lg aspect-square overflow-hidden"
                >
                  <Image
                    src={src}
                    alt={`Artwork ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover"
                  />
                </div>
              )
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
}
