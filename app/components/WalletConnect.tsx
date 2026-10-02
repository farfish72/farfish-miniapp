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
      <div className="app-panel mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Wallet</p>
            {isConnected && address && (
              <p className="text-xs text-white/60 mt-1">Connected</p>
            )}
            {!isConnected && (
              <p className="text-xs text-white/60 mt-1">Disconnected</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isPending || isConnected}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isPending || isConnected
                ? "bg-white/10 text-white/60"
                : "bg-gradient-to-r from-teal to-mint text-ink hover:opacity-90"
            }`}
          >
            {isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : isConnected && address ? (
              "Connected"
            ) : (
              "Connect Wallet"
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error.message}</p>
        )}
      </div>
    </div>
  );
}