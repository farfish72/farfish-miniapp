export const FARCASTER_PROFILE_URL =
  process.env.NEXT_PUBLIC_FARCASTER_PROFILE_URL ?? "https://farcaster.xyz/farf";
export const X_PROFILE_URL =
  process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/farfishon";
export const THIRDWEB_CLIENT_ID = "296df0fbf2b2b1bbe68977486dc0a762";
export const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ?? "";
export const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS ?? "";
export const ERC20_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ERC20_TOKEN_ADDRESS ?? "";

const REFERRAL_TOKEN_MULTIPLIERS: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 5,
};

export const referralMultiplierByTokenId = (tokenId: number): number => {
  if (!Number.isFinite(tokenId)) return 1;
  return REFERRAL_TOKEN_MULTIPLIERS[tokenId] ?? 1;
};

export const NFT_TIERS = [
  { id: 0, name: "Bluefin", multiplier: 1.0, power: 10 },
  { id: 1, name: "GoldRay", multiplier: 2.0, power: 20 },
  { id: 2, name: "RedSpike", multiplier: 3.0, power: 30 },
  { id: 3, name: "ShadowGill", multiplier: 5.0, power: 50 },
];

export const NFT_SUPPLY_TOTAL = 9999;
export const tierById = (id: number) => NFT_TIERS.find((t) => t.id === id);
export const powerById = (id: number) => (tierById(id)?.power ?? 10);
