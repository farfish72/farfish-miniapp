import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base, Chain } from "viem/chains";
import stakeAbi from "../../abi/stake.json";
import { STAKING_CONTRACT_ADDRESS } from "../../constants";
import { ensureReferralEnv, getPublicReferralEnv } from "../../config/referral";
import { getKey, smembers } from "../../../lib/upstash";

type LeaderboardRow = {
  wallet: string;
  referrals_count: number;
  stake_score: number;
  score: number;
};

export const dynamic = "force-dynamic";

const normalizeWallet = (wallet: string) => wallet.toLowerCase();

export async function GET() {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
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

    const referrers = await smembers("set:referrers");
    if (!referrers.length) {
      return NextResponse.json([]);
    }

    const withCounts = await Promise.all(
      referrers.map(async (wallet) => {
        const refCountRaw = await getKey<number | string | null>(`refcount:${normalizeWallet(wallet)}`);
        const referrals_count = Number(refCountRaw ?? 0);
        return {
          wallet: normalizeWallet(wallet),
          referrals_count: Number.isFinite(referrals_count) ? referrals_count : 0,
        };
      })
    );

    const sortedByReferrals = withCounts.sort((a, b) => b.referrals_count - a.referrals_count).slice(0, 100);

    const withStakeScores: LeaderboardRow[] = await Promise.all(
      sortedByReferrals.map(async (row) => {
        let stake_score = 0;
        try {
          const stakeInfo = await client.readContract({
            address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
            abi: stakeAbi as any,
            functionName: "getStakeInfo",
            args: [row.wallet as `0x${string}`],
          } as any);

          const totalRewards = Array.isArray(stakeInfo) && stakeInfo.length >= 3 ? (stakeInfo[2] as bigint) : BigInt(0);
          stake_score = Number(totalRewards ?? 0);
        } catch (error) {
          console.error(`Failed to read stake info for ${row.wallet}:`, error);
        }

        const score = row.referrals_count * 10 + stake_score;
        return {
          ...row,
          stake_score,
          score,
        };
      })
    );

    const finalRows = withStakeScores.sort((a, b) => b.score - a.score).slice(0, 20);
    const withRanks = finalRows.map((row, idx) => ({
      rank: idx + 1,
      ...row,
    }));

    return NextResponse.json(withRanks);
  } catch (error: any) {
    console.error("Leaderboard generation failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate leaderboard" }, { status: 500 });
  }
}

