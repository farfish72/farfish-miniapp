"use client";
import React from "react";

type NFT = {
  id: string;
  name?: string;
  rarity?: string;
  revealed: boolean;
  image?: string;
  placeholderImage?: string;
};

export default function NFTCard({ nft }: { nft: NFT }) {
  // দেখার জন্য কনটেন্ট
  const coverSrc = nft.revealed ? nft.image ?? "/placeholder.png" : nft.placeholderImage ?? "/mystery.png";
  const displayName = nft.revealed ? nft.name ?? `FarFISH #${nft.id}` : "Unknown FarFISH";
  const displayRarity = nft.revealed ? nft.rarity ?? "—" : "—";

  return (
    <div className="bg-white/5 rounded-lg overflow-hidden shadow-lg flex flex-col">
      {/* image box */}
      <div className="relative w-full h-44 sm:h-48 bg-slate-700">
        <img
          src={coverSrc}
          alt={displayName}
          className="object-cover w-full h-full"
        />
        {/* top-left small badge with id */}
        <div className="absolute top-2 left-2 bg-black/50 text-xs px-2 py-1 rounded text-white">
          #{nft.id}
        </div>
        {/* top-right rarity (if revealed show color) */}
        <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded"
             style={{ background: nft.revealed ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.35)", color: "#fff" }}>
          {nft.revealed ? displayRarity : "Mystery"}
        </div>
      </div>

      {/* bottom info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-sm sm:text-base font-semibold text-white">{displayName}</h4>
          <p className="text-xs text-gray-300 mt-1">Rarity: <span className="text-gray-200">{displayRarity}</span></p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">Status</div>
          <div className={`text-xs font-medium ${nft.revealed ? "text-green-300" : "text-yellow-300"}`}>
            {nft.revealed ? "Revealed" : "Hidden"}
          </div>
        </div>
      </div>
    </div>
  );
}
