"use client";
import React, { useState } from "react";
import Header from "../components/Header";
import Leaderboard from "../components/Leaderboard";
import StakeModal from "../components/StakeModal";

const mockEntries = [
  { rank:1, address:"0xAbCd0123...789", stakedCount:12 },
  { rank:2, address:"0xEFGf456...012", stakedCount:7 },
  { rank:3, address:"0xHIJk789...345", stakedCount:3 },
];

export default function StakePage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="min-h-screen p-4">
      <Header onConnect={() => alert("connect mock")} />
      <h2 className="text-xl font-semibold mb-3">Stake</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="bg-white/5 p-4 rounded-lg mb-4">
            <h3 className="font-semibold">NFT Stake</h3>
            <p className="text-xs text-white/70 mt-2">Select NFT and lock to earn rewards.</p>

            <div className="mt-4 flex gap-2">
              <button onClick={() => { setOpen(true) }} className="px-3 py-2 bg-emerald-500 rounded">NFT Stake</button>
              <button className="px-3 py-2 bg-white/10 rounded">Unstake</button>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">My staked NFTs</h4>
            <div className="text-xs text-white/70">You have none staked (demo)</div>
          </div>
        </div>

        <div>
          <Leaderboard entries={mockEntries} />
        </div>
      </div>

      {open && <StakeModal onClose={() => setOpen(false)} onSelectNFT={(id)=>{ setSelected(id); setOpen(false); alert("selected "+id) }} />}
    </main>
  );
}


