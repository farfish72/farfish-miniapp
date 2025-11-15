// app/components/StakeModal.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

interface StakeModalProps {
  onClose: () => void;
  onSelectNFT: (id: string) => void;
  initialFocusId?: string; // optional: which nft button to focus initially
}

const mockNFTs = [
  { id: "nft-1", title: "Fishing NFT #1" },
  { id: "nft-2", title: "Fishing NFT #2" },
  { id: "nft-3", title: "Fishing NFT #3" },
];

export default function StakeModal({ onClose, onSelectNFT, initialFocusId }: StakeModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  // focus first interactive element on open
  useEffect(() => {
    const toFocus = initialFocusId ? document.getElementById(initialFocusId) : firstButtonRef.current;
    (toFocus as HTMLElement | null)?.focus();
  }, [initialFocusId]);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // click outside to close
  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleSelect(id: string) {
    // prevent double clicks
    if (loadingId) return;
    try {
      setLoadingId(id);
      // if you need async operation (tx) you can await here
      await Promise.resolve(); // placeholder
      onSelectNFT(id);
      // close modal after select
      onClose();
    } catch (err) {
      console.error("select error", err);
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
          {mockNFTs.map((n, idx) => {
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
                <span className="text-sm text-gray-300">
                  {loadingId === n.id ? "Staking..." : "Stake"}
                </span>
              </button>
            );
          })}
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
