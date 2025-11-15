"use client";

import React, { useState } from "react";

const TOTAL_SUPPLY = 9999;
const RESERVED = 10;
const MINTED_COUNT = 15;
const REMAINING = TOTAL_SUPPLY - MINTED_COUNT;

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  function connectMock() {
    setConnected(true);
  }

  async function handleMint() {
    if (!connected) {
      alert("Please connect wallet first.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    alert("Mint simulated (replace with real mint).");
  }

  const percent = Math.round((MINTED_COUNT / TOTAL_SUPPLY) * 100 * 100) / 100;

  return (
    <main className="min-h-screen bg-[#04121a] text-white px-4 py-6 sm:px-6">
      <div className="max-w-2xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold">FarFISH</h1>
            <p className="text-sm text-white/70">
              Premium NFT collection · Fishing theme
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://warpcast.com/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white/10 rounded text-xs hover:bg-white/20 transition"
            >
              Follow
            </a>

            {connected ? (
              <div className="px-3 py-2 bg-emerald-600/60 rounded text-xs">
                Connected
              </div>
            ) : (
              <button
                onClick={connectMock}
                className="px-3 py-2 bg-fuchsia-600 rounded text-xs hover:brightness-105"
              >
                Connect Wallet
              </button>
            )}
          </div>

        </header>

        {/* MINT CARD */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-md">
          <h2 className="text-xl font-semibold">Mint Your FarFISH NFT</h2>

          <p className="mt-2 text-xs text-white/70">
            Total supply: <b>{TOTAL_SUPPLY}</b> ({RESERVED} reserved)
          </p>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-3 mt-4 text-center text-sm">
            <div>
              <div className="text-white/70 text-xs">Price</div>
              <div className="font-semibold text-base">0.03 ETH</div>
            </div>
            <div>
              <div className="text-white/70 text-xs">Minted</div>
              <div className="font-semibold text-base">{MINTED_COUNT}</div>
            </div>
            <div>
              <div className="text-white/70 text-xs">Progress</div>
              <div className="font-semibold text-base">{percent}%</div>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="mt-4 w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1]"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* ACTION BUTTON */}
          <button
            onClick={handleMint}
            disabled={!connected || loading}
            className={`mt-5 w-full py-3 rounded-md text-sm font-semibold transition ${
              connected
                ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black hover:scale-[1.02]"
                : "bg-white/10 text-white/50"
            }`}
          >
            {loading ? "Processing..." : connected ? "Mint Now" : "Connect to Mint"}
          </button>

          <div className="mt-3 text-xs text-white/70 text-center">
            Remaining: <b>{REMAINING}</b>
          </div>
        </section>

        {/* WHY MINT BOX */}
        <section className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-3">Why mint FarFISH?</h3>

          <ul className="text-sm text-white/70 space-y-2">
            <li>• Staking rewards (30/90/180/360 days)</li>
            <li>• Tier system & exclusive drops</li>
            <li>• Limited supply — 9999 NFTs</li>
          </ul>
        </section>

        {/* RARITY BOX */}
        <section className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-5">
          <h4 className="text-sm font-semibold mb-3 text-white/80">Rarity Snapshot</h4>

          <ul className="text-sm text-white/70 space-y-1">
            <li>Common — 70%</li>
            <li>Uncommon — 20%</li>
            <li>Rare — 8%</li>
            <li>Legendary — 1%</li>
          </ul>
        </section>

        {/* COLLECTION PREVIEW */}
        <section className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Collection Preview</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-lg aspect-[4/5] flex items-center justify-center text-xs text-white/50">
              Artwork 1
            </div>
            <div className="bg-white/10 rounded-lg aspect-[4/5] flex items-center justify-center text-xs text-white/50">
              Artwork 2
            </div>
            <div className="bg-white/10 rounded-lg aspect-[4/5] flex items-center justify-center text-xs text-white/50">
              Artwork 3
            </div>
            <div className="bg-white/10 rounded-lg aspect-[4/5] flex items-center justify-center text-xs text-white/50">
              Artwork 4
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 text-center text-xs text-white/50">
          FarFISH © All rights reserved.
        </footer>
      </div>
    </main>
  );
}
