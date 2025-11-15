"use client";
import { useState } from "react";
import { ethers } from "ethers";

interface Props {
  tokenId: number;
  onUnstaked: (id: number) => void;
}

export default function UnstakeCard({ tokenId, onUnstaked }: Props) {
  const [loading, setLoading] = useState(false);

  const CONTRACT_ADDRESS = "0xYourContractAddressHere"; // পরে আমি ঠিক ঠিক দিব
  const CONTRACT_ABI = [
    // এখানে শুধু প্রয়োজনীয় unstake ফাংশন দিব
    "function unstake(uint256 tokenId) public"
  ];

  async function handleUnstake() {
    try {
      if (!window.ethereum) {
        alert("Please connect MetaMask");
        return;
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.unstake(tokenId);
      await tx.wait();

      alert("NFT Unstaked Successfully!");
      onUnstaked(tokenId);
    } catch (err) {
      console.error(err);
      alert("Unstake failed! Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg mt-4 text-white">
      <h2 className="text-xl font-bold">Fishing NFT #{tokenId}</h2>

      <button
        onClick={handleUnstake}
        disabled={loading}
        className="mt-3 w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold"
      >
        {loading ? "Unstaking..." : "Unstake"}
      </button>
    </div>
  );
}
