import { NextResponse } from "next/server";
import { ensureReferralEnv } from "../../config/referral";
import { getKey, smembers } from "../../../lib/upstash";

type LeaderboardRow = {
  wallet: string;
  referrals_count: number;
  rewards: number; // Referrals × 20 FRH
};

export const dynamic = "force-dynamic";

const normalizeWallet = (wallet: string) => wallet.toLowerCase();

export async function GET() {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    // Missing env/KV → return safe empty list
    return NextResponse.json([]);
  }

  try {
    const referrers = await smembers("set:referrers");
    if (!referrers.length) {
      return NextResponse.json([]);
    }

    const withCounts = await Promise.all(
      referrers.map(async (wallet) => {
        // Unified referral count source of truth
        const countRaw = await getKey<number | string | null>(`refcount:${normalizeWallet(wallet)}`);
        const count = Number(countRaw ?? 0);

        return {
          wallet: normalizeWallet(wallet),
          referrals_count: Number.isFinite(count) && count > 0 ? count : 0,
        };
      }),
    );

    // Filter out wallets with zero referrals to avoid noise
    const nonZero = withCounts.filter((row) => row.referrals_count > 0);
    if (!nonZero.length) {
      return NextResponse.json([]);
    }

    // Calculate rewards: referrals × 20 FRH (referral-based only, no staking)
    const withRewards: LeaderboardRow[] = nonZero.map((row) => ({
      ...row,
      rewards: row.referrals_count * 20, // Referrals × 20 FRH
    }));

    // Get top 100, ranked by referral count (descending)
    const finalRows = withRewards.sort((a, b) => b.referrals_count - a.referrals_count).slice(0, 100);
    const withRanks = finalRows.map((row, idx) => ({
      rank: idx + 1,
      ...row,
    }));

    return NextResponse.json(withRanks);
  } catch (error: any) {
    console.error("Leaderboard generation failed:", error);
    // On error, return safe empty list
    return NextResponse.json([]);
  }
}

