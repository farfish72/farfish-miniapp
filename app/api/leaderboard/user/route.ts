import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, smembers } from "../../../../lib/upstash";

type LeaderboardRow = {
  rank: number;
  wallet: string;
  referrals_count: number;
  rewards: number; // Referrals × 20 FRH
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

  try {
    // Get verified referral count
    const verifiedCountRaw = await getKey<number | string | null>(`verified_refcount:${normalizeWallet(wallet)}`);
    const referrals_count = Number(verifiedCountRaw ?? 0);

    // Calculate rewards: referrals × 20 FRH (referral-based only, no staking)
    const rewards = referrals_count * 20;

    // Calculate rank by comparing with all referrers (ranked by referral count)
    const referrers = await smembers("set:referrers");
    let rank = 0;
    if (referrers.length > 0) {
      const allReferralCounts = await Promise.all(
        referrers.map(async (r) => {
          const countRaw = await getKey<number | string | null>(`verified_refcount:${normalizeWallet(r)}`);
          return Number(countRaw ?? 0);
        })
      );
      const userReferralCount = referrals_count;
      const betterCounts = allReferralCounts.filter((c) => c > userReferralCount).length;
      rank = betterCounts + 1;
    }

    return NextResponse.json({
      rank,
      wallet: normalizeWallet(wallet),
      referrals_count,
      rewards, // Referrals × 20 FRH
    } as LeaderboardRow);
  } catch (error: any) {
    console.error("User leaderboard lookup failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to get user stats" }, { status: 500 });
  }
}
