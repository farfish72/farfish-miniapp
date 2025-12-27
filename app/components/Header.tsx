"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { detectFarcasterEnvironment } from "../utils/farcaster";

export default function Header({ title }: { title: string }) {
  const [isFarcaster, setIsFarcaster] = useState(true);

  useEffect(() => {
    try {
      setIsFarcaster(detectFarcasterEnvironment());
    } catch {
      setIsFarcaster(false);
    }
  }, []);

  return (
    <div className="w-full max-w-md px-4 pt-3 pb-1 text-white">
      {/* উপরে FarFISH + Follow us */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-wide">FarFISH</h1>

        <Link
          href="https://warpcast.com/farf"
          target="_blank"
          className="text-sm bg-white/10 px-3 py-1 rounded-lg border border-white/10"
        >
          Follow us →
        </Link>
      </div>

      {/* নিচে পেজের নাম (Home / Chest / Stake / Rank / Profile) */}
      <p className="text-sm text-white/60 mt-1">{title}</p>
    </div>
  );
}
