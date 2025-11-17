// app/components/Header.tsx
"use client";
import React from "react";

export default function Header() {
  return (
    <header className="flex justify-between items-center py-4">
      <div>
        <h1 className="text-2xl font-extrabold">FarFISH</h1>
        <p className="text-sm text-white/70">Premium NFTs · Rewards Chest</p>
      </div>

      <div>
        <button className="px-3 py-1 bg-white/10 rounded-lg text-sm">Follow</button>
      </div>
    </header>
  );
}