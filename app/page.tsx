// app/page.tsx
"use client";

import Image from "next/image";
import Header from "./components/Header";
import useFarcasterGate from "./hooks/useFarcasterGate";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectWallet, useAddress, useContract, useContractRead } from "@thirdweb-dev/react";
import { sdk } from "@farcaster/miniapp-sdk";
import { NFT_CONTRACT_ADDRESS, NFT_SUPPLY_TOTAL } from "./constants";

export default function Home() {
  const { blocked, message } = useFarcasterGate();
  const [minted, setMinted] = useState<number | null>(null);
  const address = useAddress();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS || undefined);
  const { data: totalSupplyData } = useContractRead(contract, "totalSupply", []);
  const shareMessage =
    "Everyone in my Farcaster circle is talking about FarFISH! NFT stake multipliers, daily rewards and airdrops";

  useEffect(() => {
    try {
      const v = Number(totalSupplyData ?? 0);
      if (!Number.isNaN(v) && v >= 0) setMinted(v);
    } catch {
      setMinted(null);
    }
  }, [totalSupplyData]);

  const mintedDisplay = useMemo(() => (minted === null ? "—" : minted), [minted]);
  const mintedProgress = useMemo(() => {
    if (minted === null) return 0;
    return Math.min(100, Math.max(0, (minted / NFT_SUPPLY_TOTAL) * 100));
  }, [minted]);
  const remainingSupply = minted === null ? "—" : Math.max(0, NFT_SUPPLY_TOTAL - minted);

  const handleShare = useCallback(() => {
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareMessage)}`;
    try {
      sdk.actions.openUrl(warpcastUrl);
    } catch {
      if (typeof window !== "undefined") {
        window.open(warpcastUrl, "_blank", "noopener,noreferrer");
      }
    }
  }, [shareMessage]);

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
              <p className="font-bold">{mintedDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Progress</p>
              <p className="font-bold">
                {minted === null ? "—" : `${mintedProgress.toFixed(2)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Remaining</p>
              <p className="font-bold">{remainingSupply}</p>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1]"
              style={{ width: `${mintedProgress}%` }}
            />
          </div>

          {/* MINT BUTTON */}
          {blocked ? (
            <div className="w-full mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-center text-xs font-semibold text-red-400">
              {message}
            </div>
          ) : (
            <div className="w-full mt-4">
              <ConnectWallet
                theme="dark"
                btnTitle={address ? "Mint with connected wallet" : "Connect Farcaster wallet"}
                className="w-full"
                modalTitle="Connect wallet"
              />
            </div>
          )}

          {/* SHARE BUTTON */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full mt-2 bg-white/10 text-white py-2 rounded-lg text-sm transition hover:bg-white/20"
          >
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
