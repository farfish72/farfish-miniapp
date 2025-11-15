"use client";

import React from "react";

interface ConfirmStakeModalProps {
  nft: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmStakeModal({
  nft,
  onClose,
  onConfirm,
}: ConfirmStakeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[90%] max-w-md bg-[#071022] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-bold">Confirm Stake</h3>
        <p className="mt-2 text-sm text-gray-300">
          Are you sure you want to stake <span className="font-semibold">{nft}</span>?
        </p>

        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 rounded-md"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            Confirm Stake
          </button>
        </div>
      </div>
    </div>
  );
}
