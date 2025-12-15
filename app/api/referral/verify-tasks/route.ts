import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey, incrKey } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

/**
 * Verify that a user has completed both tasks:
 * 1. Follow FarFISH on Farcaster
 * 2. Like & Recast the provided post
 * 
 * Only when both are verified, count as a verified referral for the referrer
 */
export async function POST(req: NextRequest) {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
  }

  const callerWallet = req.headers.get("x-user-wallet")?.trim();
  if (!callerWallet || !walletRegex.test(callerWallet)) {
    return NextResponse.json({ error: "Missing or invalid caller wallet" }, { status: 400 });
  }

  let body: { followComplete?: boolean; recastComplete?: boolean } = {};
  try {
    body = (await req.json()) as { followComplete?: boolean; recastComplete?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const followComplete = Boolean(body.followComplete);
  const recastComplete = Boolean(body.recastComplete);

  try {
    const wallet = callerWallet.toLowerCase();

    // Store task completion status
    await setKey(`tasks:${wallet}`, {
      followComplete,
      recastComplete,
      updatedAt: new Date().toISOString(),
    });

    // Note: Referral counting now happens immediately on app open via /api/referral/record
    // Tasks are UX-based only (soft verification) and don't affect referral counting
    // This endpoint just stores task completion status for display purposes

    return NextResponse.json({
      success: true,
      followComplete,
      recastComplete,
    });
  } catch (error: any) {
    console.error("Task verification failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to verify tasks" }, { status: 500 });
  }
}
