import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey } from "../../../../lib/upstash";

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
    // Get task completion status from KV
    const tasksRaw = await getKey<{ followComplete?: boolean; recastComplete?: boolean } | null>(`tasks:${wallet}`);
    
    const followComplete = tasksRaw?.followComplete ?? false;
    const recastComplete = tasksRaw?.recastComplete ?? false;

    return NextResponse.json({
      followComplete,
      recastComplete,
    });
  } catch (error: any) {
    console.error("Failed to fetch task status:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch task status" }, { status: 500 });
  }
}
