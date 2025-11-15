"use client";

import { useState } from "react";

export default function StakedNFT() {
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      setLoading(true);

      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("No injected wallet found");
      }

      // Browser Provider (ethers v6)
      const provider = new (window as any).ethers.BrowserProvider(window.ethereum);


      // Request wallet access
      await provider.send("eth_requestAccounts", []);

      // Get signer (current user)
      const signer = await provider.getSigner();

      console.log("Connected:", await signer.getAddress());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={connectWallet} disabled={loading}>
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );
}
