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
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
  }

  try {
    const referrers = await smembers("set:referrers");
    if (!referrers.length) {
      return NextResponse.json([]);
    }

    const withCounts = await Promise.all(
      referrers.map(async (wallet) => {
        // Use verified referral count instead of raw count
        const verifiedCountRaw = await getKey<number | string | null>(`verified_refcount:${normalizeWallet(wallet)}`);
        const verified_count = Number(verifiedCountRaw ?? 0);
        
        return {
          wallet: normalizeWallet(wallet),
          referrals_count: Number.isFinite(verified_count) ? verified_count : 0,
        };
      })
    );

    // Calculate rewards: referrals × 20 FRH (referral-based only, no staking)
    const withRewards: LeaderboardRow[] = withCounts.map((row) => ({
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
    return NextResponse.json({ error: error?.message || "Failed to generate leaderboard" }, { status: 500 });
  }
}

