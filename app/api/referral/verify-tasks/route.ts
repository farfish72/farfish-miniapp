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

    // Check if both tasks are completed
    const bothComplete = followComplete && recastComplete;

    // If both tasks are now complete, verify the referral for the referrer
    if (bothComplete) {
      const refRecordRaw = await getKey<string | null>(`ref:${wallet}`);
      if (refRecordRaw) {
        let referrer = "";
        try {
          const parsed = JSON.parse(refRecordRaw as string);
          referrer = parsed?.referrer || "";
        } catch {
          referrer = typeof refRecordRaw === "string" ? refRecordRaw : "";
        }

        if (referrer) {
          // Check if this referral was already verified
          const verifiedKey = `verified:${wallet}`;
          const alreadyVerifiedRaw = await getKey<string>(verifiedKey);
          const alreadyVerified = alreadyVerifiedRaw === "true";
          
          if (!alreadyVerified) {
            // Mark as verified
            await setKey(verifiedKey, "true");
            
            // Increment verified referral count for referrer
            await incrKey(`verified_refcount:${referrer.toLowerCase()}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      bothComplete,
      followComplete,
      recastComplete,
    });
  } catch (error: any) {
    console.error("Task verification failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to verify tasks" }, { status: 500 });
  }
}
