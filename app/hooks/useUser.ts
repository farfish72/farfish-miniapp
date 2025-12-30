"use client";

import { useAccount } from "wagmi";
import { useEffect, useMemo, useState } from "react";
 

type Rarity = "common" | "rare" | "epic" | "legendary";

type RarityBreakdown = Record<Rarity, number>;

type UserStats = {
  nftsOwned?: number;
  staked?: number;
  streakDays?: number;
  rankLabel?: string;
  rarityBreakdown?: RarityBreakdown;
};

type FarcasterUser = {
  displayName: string;
  fid: number;
  pfpUrl: string;
  walletAddress: string;
  stats?: UserStats;
};

const rarityOrder: Rarity[] = ["common", "rare", "epic", "legendary"];

const CONTRACTS = {
  token: "0x00A3E047EbA4a769e310f515fD43203A4CEc4467",
  nftCollection: "0x392B843aB6d3AC78A2ECeA9b0aFB7f2BD59c61FB",
  staking: "0xAb3B485a558E6E7b917970Ed18e9A714996c5A3F",
};

const rarityFromAttributes = (attributes?: Record<string, any>): Rarity => {
  if (!attributes) return "common";
  const rarityAttribute =
    attributes?.rarity ||
    attributes?.Rarity ||
    attributes?.attributes?.find?.((attr: any) => attr.trait_type?.toLowerCase?.() === "rarity")?.value;

  const value = String(rarityAttribute ?? "").toLowerCase();
  if (value.includes("legend")) return "legendary";
  if (value.includes("epic")) return "epic";
  if (value.includes("rare")) return "rare";
  return "common";
};

const defaultBreakdown = (): RarityBreakdown => ({
  common: 0,
  rare: 0,
  epic: 0,
  legendary: 0,
});

type ProfileRow = {
  display_name?: string | null;
  fid?: number | null;
  pfp_url?: string | null;
  streak_days?: number | null;
  rank_label?: string | null;
};

export default function useUser() {
  const { address } = useAccount();
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [rarityBreakdown, setRarityBreakdown] = useState<RarityBreakdown>(defaultBreakdown());
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stakedCount, setStakedCount] = useState(0);

  const displayName =
    (profile?.display_name as string | undefined) ?? "FarFISH Captain";
  const fid = Number(
    profile?.fid ?? 0
  );
  const rawPfp = (profile?.pfp_url as string | undefined) ?? undefined;
  const pfpUrl = rawPfp && !String(rawPfp).startsWith("data:")
    ? String(rawPfp)
    : "https://avatar.vercel.sh/1";

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      if (!address) {
        if (!cancelled) {
          setProfile(null);
          setStakedCount(0);
        }
        return;
      }
      if (cancelled) return;
      setProfile(null);
      setStakedCount(0);
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address) {
        setRarityBreakdown(defaultBreakdown());
        return;
      }

      setLoadingNFTs(true);
      try {
        setRarityBreakdown(defaultBreakdown());
      } catch (error) {
        console.error("Failed to fetch owned NFTs", error);
        setRarityBreakdown(defaultBreakdown());
      } finally {
        setLoadingNFTs(false);
      }
    };

    fetchNFTs();
  }, [address]);

  const nftsOwned = useMemo(
    () => rarityOrder.reduce((total, rarity) => total + (rarityBreakdown[rarity] ?? 0), 0),
    [rarityBreakdown]
  );

  const stats: UserStats = {
    nftsOwned,
    staked: stakedCount,
    streakDays: profile?.streak_days ?? 0,
    rankLabel:
      profile?.rank_label ??
      (nftsOwned >= 5 ? "Gold" : nftsOwned >= 3 ? "Silver" : nftsOwned > 0 ? "Bronze" : "Unranked"),
    rarityBreakdown,
  };

  const connectedUser: FarcasterUser | null = address
    ? {
        displayName,
        fid,
        pfpUrl,
        walletAddress: address,
        stats,
      }
    : null;

  return {
    user: connectedUser,
    loadingNFTs,
  };
}

export type { FarcasterUser, RarityBreakdown };

