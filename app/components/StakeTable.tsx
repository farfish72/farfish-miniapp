"use client";

import React from "react";
import { STAKING_TOKEN_RANGES, STAKING_REWARDS } from "../constants";

export default function StakeTable() {
  const rarities = Object.keys(STAKING_TOKEN_RANGES) as Array<keyof typeof STAKING_TOKEN_RANGES>;
  const lockDurations: Array<30 | 90 | 180 | 360> = [30, 90, 180, 360];

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <h3 className="font-semibold text-lg mb-4">FarFISH Official NFT Staking Reward Table</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/70 border-b border-white/10">
              <th className="text-left py-3 px-2">Rarity</th>
              <th className="text-left py-3 px-2">Token ID Range</th>
              <th className="text-left py-3 px-2">30 Days (FRH)</th>
              <th className="text-left py-3 px-2">90 Days (FRH)</th>
              <th className="text-left py-3 px-2">180 Days (FRH)</th>
              <th className="text-left py-3 px-2">360 Days (FRH)</th>
            </tr>
          </thead>
          <tbody>
            {rarities.map((rarity) => {
              const range = STAKING_TOKEN_RANGES[rarity];
              const rangeStr = range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`;
              const rewards = STAKING_REWARDS[rarity];

              return (
                <tr key={rarity} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="py-3 px-2 font-medium">{rarity}</td>
                  <td className="py-3 px-2 text-white/70">{rangeStr}</td>
                  {lockDurations.map((duration) => (
                    <td key={duration} className="py-3 px-2">
                      {rewards[duration].toLocaleString()}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-white/70 space-y-1">
        <p>- Rewards are fixed and permanent</p>
        <p>- You select both NFT and staking duration</p>
        <p>- Higher NFT rarity gives higher FRH reward</p>
        <p>- Monthly rewards are distributed from the Chest page</p>
      </div>
    </section>
  );
}

