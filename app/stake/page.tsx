// app/stake/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import StakeModal from "../components/StakeModal";

const DAY_MS = 1000 * 60 * 60 * 24;

const lockOptions = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
];

type StakedItem = {
  id: string;
  name: string;
  image: string;
  lockDays: number;
  stakedAt: number;
};

export default function StakingPage() {
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [selectedLockDays, setSelectedLockDays] = useState<number | null>(30);
  const [modalOpen, setModalOpen] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [staked, setStaked] = useState<StakedItem[]>(() => {
    const n = Date.now();
    return [
      {
        id: "nft-101",
        name: "Fishing NFT #101",
        image: "https://placehold.co/400x400/222/00ffff?text=Item",
        lockDays: 30,
        stakedAt: n - 5 * DAY_MS,
      },
      {
        id: "nft-202",
        name: "Fishing NFT #202",
        image: "https://placehold.co/400x400/222/00ffff?text=Item",
        lockDays: 30,
        stakedAt: n - 31 * DAY_MS,
      },
    ];
  });

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const handleStake = () => {
    if (!selectedNFT || !selectedLockDays) return;
    const item: StakedItem = {
      id: selectedNFT,
      name: `Fishing NFT ${selectedNFT.replace("nft-", "#")}`,
      image: "https://placehold.co/400x400/222/00ffff?text=Item",
      lockDays: selectedLockDays,
      stakedAt: Date.now(),
    };
    setStaked((prev) => [item, ...prev]);
    setSelectedNFT(null);
  };

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return "Unlocked";
    const totalMinutes = Math.ceil(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `Unlocks in: ${days}d ${hours}h`;
    if (hours > 0) return `Unlocks in: ${hours}h ${minutes}m`;
    return `Unlocks in: ${minutes}m`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Stake" />

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-xl font-bold">Locked Staking</h2>
          <p className="text-sm text-white/70 mt-1">Stake NFTs with a fixed lock. No early unstake.</p>

          <div className="mt-4 space-y-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">Selected NFT</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {selectedNFT ? `Fishing NFT ${selectedNFT.replace("nft-", "#")}` : "No NFT selected"}
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-xs bg-white/10 px-3 py-1 rounded-md border border-white/10"
                >
                  Select
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {lockOptions.map((option) => {
                const active = selectedLockDays === option.days;
                return (
                  <button
                    key={option.label}
                    onClick={() => setSelectedLockDays(option.days)}
                    className={`rounded-lg border px-2 py-3 text-xs font-semibold ${
                      active ? "border-[#00d4c4] bg-[#00d4c4]/10 text-white" : "border-white/10 bg-white/5 text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleStake}
              disabled={!selectedNFT || !selectedLockDays}
              className={`w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg ${
                !selectedNFT || !selectedLockDays ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Stake
            </button>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-lg">Your Staked NFTs</h3>
          {staked.length === 0 ? (
            <p className="text-sm text-white/70 mt-1">No NFTs are staked yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {staked.map((item) => {
                const unlockAt = item.stakedAt + item.lockDays * DAY_MS;
                const remainingMs = unlockAt - nowTick;
                const unlocked = remainingMs <= 0;
                return (
                  <div
                    key={`${item.id}-${item.stakedAt}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/10">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-white/60">{item.lockDays} Days Lock</p>
                        <p className={`text-xs ${unlocked ? "text-green-400" : "text-white/70"}`}>
                          {unlocked ? "Unlocked" : formatRemaining(remainingMs)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() =>
                          unlocked &&
                          setStaked((prev) => prev.filter((s) => !(s.id === item.id && s.stakedAt === item.stakedAt)))
                        }
                        disabled={!unlocked}
                        className={`px-3 py-2 rounded-md text-sm font-semibold ${
                          unlocked
                            ? "bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black"
                            : "bg-white/10 text-white/60 cursor-not-allowed"
                        }`}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-white/60 mt-2">Unstake is disabled until lock ends.</p>
        </section>
      </div>

      {modalOpen && (
        <StakeModal
          onClose={() => setModalOpen(false)}
          onSelectNFT={(id) => setSelectedNFT(id)}
          initialFocusId={undefined}
        />
      )}
    </div>
  );
}
