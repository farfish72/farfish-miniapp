"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAddress, useContract } from "@thirdweb-dev/react";
import { supabase } from "../lib/supabase";
import { NFT_CONTRACT_ADDRESS } from "../constants";

interface StakeModalProps {
  onClose: () => void;
  onSelectNFT: (id: string) => void;
  initialFocusId?: string;
}

type Choice = { id: string; title: string };

export default function StakeModal({ onClose, onSelectNFT, initialFocusId }: StakeModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const address = useAddress();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS || undefined, "nft-drop");

  useEffect(() => {
    const toFocus = initialFocusId ? document.getElementById(initialFocusId) : firstButtonRef.current;
    (toFocus as HTMLElement | null)?.focus();
  }, [initialFocusId]);

  useEffect(() => {
    async function load() {
      if (!address || !contract) {
        setChoices([]);
        return;
      }
      let owned: any[] = [];
      let stakedIds = new Set<number>();
      try {
        owned = await contract.getOwned(address);
      } catch {}
      try {
        const { data } = await supabase
          .from("staking_positions")
          .select("token_id")
          .eq("wallet_address", address);
        (data ?? []).forEach((row: any) => stakedIds.add(Number(row.token_id)));
      } catch {}

      const list: Choice[] = owned
        .map((nft: any) => {
          const tokenId = Number(nft?.id ?? nft?.metadata?.id ?? nft?.metadata?.tokenId ?? 0);
          return { tokenId };
        })
        .filter((x: { tokenId: number }) => Number.isFinite(x.tokenId) && !stakedIds.has(x.tokenId))
        .map((x) => ({ id: `nft-${x.tokenId}`, title: `Fishing NFT #${x.tokenId}` }));

      setChoices(list);
    }
    load();
  }, [address, contract]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleSelect(id: string) {
    if (loadingId) return;
    try {
      setLoadingId(id);
      onSelectNFT(id);
      onClose();
    } catch {
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Select an NFT to stake"
    >
      <div className="w-[92%] max-w-lg bg-[#0b1220] rounded-xl p-6 border border-white/10 shadow-lg">
        <h2 className="text-xl font-semibold mb-3 text-white">Select NFT to Stake</h2>

        <div className="space-y-3">
          {choices.length === 0 ? (
            <div className="text-sm text-white/60">No eligible NFTs to stake.</div>
          ) : (
            choices.map((n, idx) => {
              const idAttr = `stake-btn-${n.id}`;
              return (
                <button
                  id={idAttr}
                  key={n.id}
                  ref={idx === 0 ? firstButtonRef : undefined}
                  onClick={() => handleSelect(n.id)}
                  disabled={!!loadingId}
                  className="w-full text-left p-3 bg-white/5 rounded-md hover:bg-white/6 transition flex justify-between items-center"
                >
                  <span className="text-white">{n.title}</span>
                  <span className="text-sm text-white/70">{loadingId === n.id ? "Staking..." : "Stake"}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 rounded-md text-white"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
