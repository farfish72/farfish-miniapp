import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey, incrKey, sadd } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

/**
 * Record referral when app opens with ?ref=XXXXXXXX param
 * This is the SINGLE SOURCE OF TRUTH for referral counting
 * - Registers referral binding
 * - Updates referral count immediately
 * - Updates leaderboard automatically (via refcount)
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

  let body: { refCode?: string } = {};
  try {
    body = (await req.json()) as { refCode?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const refCode = body.refCode?.trim().toLowerCase();
  if (!refCode || refCode.length !== 8) {
    return NextResponse.json({ error: "Invalid refCode (must be 8 characters)" }, { status: 400 });
  }

  try {
    const wallet = callerWallet.toLowerCase();

    // Block self-referral
    const walletLast8 = wallet.slice(-8).toLowerCase();
    if (walletLast8 === refCode) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Lookup referrer wallet from refCode
    const referrerWallet = await getKey<string>(`refcode:${refCode}`);
    if (!referrerWallet) {
      return NextResponse.json({ error: "RefCode not found" }, { status: 404 });
    }

    const referrer = referrerWallet.toLowerCase();

    // Block self-referral (double check)
    if (wallet === referrer) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Check if already bound
    const existing = await getKey<string>(`ref:${wallet}`);
    if (existing) {
      // Already bound - return success but don't increment again
      return NextResponse.json({ success: true, referrer, alreadyBound: true });
    }

    // Store referral binding
    const payload = {
      referrer: referrer,
      createdAt: new Date().toISOString(),
    };
    await setKey(`ref:${wallet}`, payload);
    await sadd("set:referrers", referrer);

    // IMMEDIATELY increment referral count for referrer (this updates leaderboard)
    await incrKey(`verified_refcount:${referrer}`);

    return NextResponse.json({ success: true, referrer });
  } catch (error: any) {
    console.error("Referral recording failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to record referral" }, { status: 500 });
  }
}
