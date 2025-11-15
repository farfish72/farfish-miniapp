// components/StakedNFT.tsx
import React, { useState } from "react";
import { ethers } from "ethers";

type Props = {
  tokenId: string | number;
  image?: string;
  name?: string;
  onUnstaked?: (tokenId: string | number) => void;
  // supply your contract details via env or import
  contractAddress: string;
  contractAbi: any;
};

export default function StakedNFT({
  tokenId,
  image,
  name,
  onUnstaked,
  contractAddress,
  contractAbi,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleUnstake() {
    try {
      if (!window.ethereum) {
        alert("No wallet found. Please install MetaMask.");
        return;
      }

      setLoading(true);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []); // request connect
      const signer = provider.getSigner();

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      // method name may vary: 'unstake', 'withdraw', etc.
      // replace 'unstake' with your contract's exact function name and parameter types
      const tx = await contract.unstake(tokenId);
      setTxHash(tx.hash);

      // wait for mined
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        // success
        if (onUnstaked) onUnstaked(tokenId);
        alert("Unstake successful!");
      } else {
        alert("Transaction failed.");
      }
    } catch (err: any) {
      console.error("Unstake error:", err);
      const message = err?.data?.message || err?.message || String(err);
      alert("Error unstaking: " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="staked-nft-card">
      <div className="staked-nft-thumb">
        {image ? <img src={image} alt={name || `NFT ${tokenId}`} /> : <div className="placeholder" />}
      </div>
      <div className="staked-nft-meta">
        <h4>{name || `Fishing NFT #${tokenId}`}</h4>
        <p>Token ID: {tokenId}</p>
        <div>
          <button
            onClick={handleUnstake}
            disabled={loading}
            className="btn btn-unstake"
          >
            {loading ? "Unstaking..." : "Unstake"}
          </button>
        </div>
        {txHash && (
          <small>
            Tx: <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0, 10)}...</a>
          </small>
        )}
      </div>
    </div>
  );
}
