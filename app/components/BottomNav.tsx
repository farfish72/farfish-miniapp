"use client";
import React from "react";
import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
      <ul className="space-y-3">
        <li><Link href="/" className="block px-3 py-2 rounded-lg bg-white/8 text-white text-sm">Home</Link></li>
        <li><Link href="/chest" className="block px-3 py-2 rounded-lg bg-white/8 text-white text-sm">Chest</Link></li>
        <li><Link href="/stake" className="block px-3 py-2 rounded-lg bg-white/8 text-white text-sm">NFT Stake</Link></li>
        <li><Link href="/leaderboard" className="block px-3 py-2 rounded-lg bg-white/8 text-white text-sm">Rank</Link></li>
        <li><Link href="/profile" className="block px-3 py-2 rounded-lg bg-white/8 text-white text-sm">Me</Link></li>
      </ul>
    </nav>
  );
}

