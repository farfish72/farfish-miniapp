"use client";

import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import CONTRACT_ABI from "../abi/stake.json";

// Your final contract address
const CONTRACT_ADDRESS =
  "0xAb3B485a558E6E7b917970Ed18e9A714996c5A3F";

export default function StakedNFT() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Connect Wallet ----
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window === "undefined" || !window.ethereum) {
        alert("Please install MetaMask!");
        setLoading(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      setConnected(true);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Wallet connection failed.");
      setLoading(false);
    }
  };

  // ---- Stake NFT ----
  const handleStake = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI as any,
        signer
      );

      const tx = await contract.stake();
      await tx.wait();

      alert("Stake successful!");
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Stake failed.");
      setLoading(false);
    }
  };

  // ---- Unstake NFT ----
  const handleUnstake = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI as any,
        signer
      );

      const tx = await contract.unstake();
      await tx.wait();

      alert("Unstake successful!");
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unstake failed.");
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "20px" }}>
      <h2>NFT Staking Dashboard</h2>

      {!connected ? (
        <button onClick={connectWallet} disabled={loading}>
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <p>Connected: {account}</p>
      )}

      {connected && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={handleStake} disabled={loading}>
            {loading ? "Processing..." : "Stake NFT"}
          </button>

          <button
            onClick={handleUnstake}
            disabled={loading}
            style={{ marginLeft: "10px" }}
          >
            {loading ? "Processing..." : "Unstake NFT"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </main>
  );
}