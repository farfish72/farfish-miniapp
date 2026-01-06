"use client";

import { useMemo } from "react";
import { useAccount, useConnect } from "wagmi";
import { detectFarcasterEnvironment } from "../utils/farcaster";

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();

  const isFarcaster = useMemo(() => detectFarcasterEnvironment(), []);

  const handleConnect = () => {
    const connector = connectors[0];
    if (!connector) return;
    connect({ connector });
  };

  if (!isFarcaster) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Wallet Status</p>
            {isConnected && address && (
              <p className="text-xs text-white/60 mt-1">Connected to Base</p>
            )}
            {!isConnected && (
              <p className="text-xs text-white/60 mt-1">Ready to connect</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isPending || isConnected}
            className={`px-3 py-1 rounded-md text-xs font-semibold ${
              isPending || isConnected
                ? "bg-white/10 text-white/60"
                : "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black"
            }`}
          >
            {isConnected && address
              ? `Active`
              : isPending
              ? "Connecting..."
              : "Connect Wallet"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error.message}</p>
        )}
      </div>
    </div>
  );
}