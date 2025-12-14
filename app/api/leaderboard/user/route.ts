import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base, Chain } from "viem/chains";
import stakeAbi from "../../../abi/stake.json";
import { STAKING_CONTRACT_ADDRESS } from "../../../constants";
import { ensureReferralEnv, getPublicReferralEnv } from "../../../config/referral";
import { getKey, smembers } from "../../../../lib/upstash";

type LeaderboardRow = {
  rank: number;
  wallet: string;
  referrals_count: number;
  stake_score: number;
  score: number;
};

export const dynamic = "force-dynamic";

const normalizeWallet = (wallet: string) => wallet.toLowerCase();

export async function GET(req: NextRequest) {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
  }

  const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  if (!STAKING_CONTRACT_ADDRESS) {
    return NextResponse.json({ error: "Missing staking contract address" }, { status: 500 });
  }

  try {
    const { chainId } = getPublicReferralEnv();
    const chain: Chain = chainId === base.id ? base : { ...base, id: chainId };
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get verified referral count
    const verifiedCountRaw = await getKey<number | string | null>(`verified_refcount:${normalizeWallet(wallet)}`);
    const referrals_count = Number(verifiedCountRaw ?? 0);

    // Get stake score
    let stake_score = 0;
    try {
      const stakeInfo = await client.readContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakeAbi as any,
        functionName: "getStakeInfo",
        args: [wallet as `0x${string}`],
      } as any);

      const totalRewards = Array.isArray(stakeInfo) && stakeInfo.length >= 3 ? (stakeInfo[2] as bigint) : BigInt(0);
      stake_score = Number(totalRewards ?? 0);
    } catch (error) {
      console.error(`Failed to read stake info for ${wallet}:`, error);
    }

    // No multiplier logic - rewards = direct FRH amount (stake_score)
    // Rank by stake_score only (direct FRH rewards)

    // Calculate rank by comparing with all referrers
    const referrers = await smembers("set:referrers");
    let rank = 0;
    if (referrers.length > 0) {
      const allStakeScores = await Promise.all(
        referrers.map(async (r) => {
          let stScore = 0;
          try {
            const sInfo = await client.readContract({
              address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
              abi: stakeAbi as any,
              functionName: "getStakeInfo",
              args: [normalizeWallet(r) as `0x${string}`],
            } as any);
            const tRewards = Array.isArray(sInfo) && sInfo.length >= 3 ? (sInfo[2] as bigint) : BigInt(0);
            stScore = Number(tRewards ?? 0);
          } catch {
            // Ignore errors
          }
          return stScore; // Use stake_score only for ranking
        })
      );
      const userStakeScore = stake_score;
      const betterScores = allStakeScores.filter((s) => s > userStakeScore).length;
      rank = betterScores + 1;
    }

    return NextResponse.json({
      rank,
      wallet: normalizeWallet(wallet),
      referrals_count,
      stake_score,
      score: stake_score, // No multiplier - score = stake_score (direct FRH)
    } as LeaderboardRow);
  } catch (error: any) {
    console.error("User leaderboard lookup failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to get user stats" }, { status: 500 });
  }
}
