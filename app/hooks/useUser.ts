"use client";

import {
  useAddress,
  useBalance,
  useContract,
  useUser as useThirdwebUser,
} from "@thirdweb-dev/react";
import { useEffect, useMemo, useState } from "react";

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

export default function useUser() {
  const address = useAddress();
  const { user } = useThirdwebUser();
  const { contract: nftContract } = useContract(CONTRACTS.nftCollection, "nft-drop");
  const { data: balanceData } = useBalance(address);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [rarityBreakdown, setRarityBreakdown] = useState<RarityBreakdown>(defaultBreakdown());

  const rawData = user?.data as any;
  const displayName = (rawData?.name as string) ?? "FarFISH Captain";
  const fid = (rawData?.fid as number) ?? 0;
  const rawPfp = rawData?.pfp as string | undefined;
  const pfpUrl = rawPfp && !String(rawPfp).startsWith("data:")
    ? String(rawPfp)
    : "https://avatar.vercel.sh/1";

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
    staked: 0, // TODO: integrate staking contract positions
    streakDays: 0,
    rankLabel: nftsOwned >= 5 ? "Gold" : nftsOwned >= 3 ? "Silver" : nftsOwned > 0 ? "Bronze" : "Unranked",
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

