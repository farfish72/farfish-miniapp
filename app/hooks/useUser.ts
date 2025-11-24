"use client";

import {
  useAddress,
  useBalance,
  useContract,
  useUser as useThirdwebUser,
} from "@thirdweb-dev/react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Rarity = "common" | "rare" | "epic" | "legendary";

type RarityBreakdown = Record<Rarity, number>;

type UserStats = {
  nftsOwned?: number;
  staked?: number;
  streakDays?: number;
  rankLabel?: string;
  rarityBreakdown?: RarityBreakdown;
  walletBalance?: string;
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
  const address = useAddress();
  const { user } = useThirdwebUser();
  const { contract: nftContract } = useContract(CONTRACTS.nftCollection, "nft-drop");
  const { data: balanceData } = useBalance(address);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [rarityBreakdown, setRarityBreakdown] = useState<RarityBreakdown>(defaultBreakdown());
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stakedCount, setStakedCount] = useState(0);

  const rawData = user?.data as any;
  const displayName =
    (profile?.display_name as string | undefined) ?? (rawData?.name as string) ?? "FarFISH Captain";
  const fid = Number(
    profile?.fid ?? (rawData?.fid as number | undefined) ?? 0
  );
  const rawPfp = (profile?.pfp_url as string | undefined) ?? (rawData?.pfp as string | undefined);
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
      try {
        const [{ data: profileData }, { data: stakingData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, fid, pfp_url, streak_days, rank_label")
            .eq("wallet_address", address)
            .limit(1)
            .maybeSingle(),
          supabase.from("staking_positions").select("token_id").eq("wallet_address", address),
        ]);
        if (cancelled) return;
        setProfile((profileData as ProfileRow) ?? null);
        setStakedCount((stakingData as { token_id: number }[] | null)?.length ?? 0);
      } catch (error) {
        if (!cancelled) {
          setProfile(null);
          setStakedCount(0);
          console.error("Failed to fetch profile data", error);
        }
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!nftContract || !address) {
        setRarityBreakdown(defaultBreakdown());
        return;
      }

      setLoadingNFTs(true);
      try {
        const owned = await nftContract.getOwned(address);
        const breakdown = defaultBreakdown();

        owned.forEach((nft) => {
          const rarity = rarityFromAttributes(nft.metadata?.attributes);
          breakdown[rarity] += 1;
        });

        setRarityBreakdown(breakdown);
      } catch (error) {
        console.error("Failed to fetch owned NFTs", error);
        setRarityBreakdown(defaultBreakdown());
      } finally {
        setLoadingNFTs(false);
      }
    };

    fetchNFTs();
  }, [address, nftContract]);

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
    walletBalance: balanceData?.displayValue
      ? `${Number(balanceData.displayValue).toFixed(4)} ${balanceData.symbol}`
      : undefined,
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

