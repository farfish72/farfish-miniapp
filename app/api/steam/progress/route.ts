import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey } from "../../../../lib/upstash";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: NextRequest) {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    // Missing env/KV → return empty progress
    return NextResponse.json({ progress: {}, referralCount: 0 });
  }

  const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  try {
    // Get user progress from KV
    const userDataRaw = await getKey<string | Record<string, unknown> | null>(`user:${wallet}`);
    let progress = {};

    if (userDataRaw) {
      if (typeof userDataRaw === "string") {
        try {
          progress = JSON.parse(userDataRaw);
        } catch {
          progress = {};
        }
      } else if (typeof userDataRaw === "object" && userDataRaw !== null) {
        progress = userDataRaw;
      }
    }

    // Get referral count from existing referral system (read-only)
    const referralCountRaw = await getKey<number | string | null>(`refcount:${wallet}`);
    const referralCount = Number(referralCountRaw ?? 0);

    return NextResponse.json({ progress, referralCount });
  } catch (error: any) {
    console.error("Failed to fetch task progress:", error);
    return NextResponse.json({ progress: {}, referralCount: 0 });
  }
}