"use client";

import React from "react";

export default function Header() {
  return (
    <header className="hidden md:flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">FarFISH</h1>
        <span className="text-white/60 text-sm">
          Premium NFT Collection
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="#"
          className="px-3 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
        >
          Follow on Farcaster
        </a>

        <button className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 rounded-lg text-sm font-semibold">
          Connect Wallet
        </button>
      </div>
    </header>
  );
}