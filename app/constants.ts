export const FARCASTER_PROFILE_URL =
  process.env.NEXT_PUBLIC_FARCASTER_PROFILE_URL ?? "https://farcaster.xyz/farf";
export const X_PROFILE_URL =
  process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/farfishon";
export const THIRDWEB_CLIENT_ID = "296df0fbf2b2b1bbe68977486dc0a762";

export const REFERRAL_MULTIPLIER = (tier: number): number => {
  const map = [1.5, 2.0, 3.0, 5.0];
  if (tier < 0 || tier >= map.length || Number.isNaN(tier)) return 1.0;
  return map[tier];
};
