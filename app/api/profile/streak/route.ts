import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getRedisClient } from "../../../../lib/redis";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
  }

  const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    
    // Get chest streak from Redis: streak:{wallet}
    const streakKey = `streak:${wallet}`;
    const streakDays = await redis.get<number>(streakKey) ?? 0;

    return NextResponse.json({ streakDays });
  } catch (error: any) {
    console.error("Failed to fetch chest streak:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch chest streak" }, { status: 500 });
  }
}
