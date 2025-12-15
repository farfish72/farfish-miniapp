import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, incrKey, setKey } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

type RecordReferralBody = {
  wallet: string;
  refCode: string;
};

/**
 * Minimal referral capture endpoint.
 *
 * Flow:
 * - User opens app via referral link (?ref=XXXXXXXX)
 * - App detects connected wallet and POSTs { wallet, refCode }
 * - This endpoint stores ONE record per referred wallet:
 *   key:   referral:{wallet}
 *   value: { referrer: string, createdAt: string }
 *
 * Rules:
 * - Do NOT overwrite an existing referral entry
 * - Do NOT verify tasks or track task completion
 */
export async function POST(req: NextRequest) {
  let body: RecordReferralBody;
  try {
    body = (await req.json()) as RecordReferralBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawWallet = body.wallet?.trim();
  const wallet = rawWallet?.toLowerCase();
  const refCode = body.refCode?.trim().toLowerCase();

  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  if (!refCode || refCode.length !== 8) {
    return NextResponse.json({ error: "Invalid refCode (must be 8 characters)" }, { status: 400 });
  }

  try {
    // Validate env only when we are about to touch KV
    try {
      ensureReferralEnv();
    } catch (error: any) {
      // Soft-fail if env/KV missing – do not crash client, just skip recording
      return NextResponse.json(
        { success: false, error: error?.message || "Referral storage unavailable" },
        { status: 200 },
      );
    }

    // If this wallet already has a referral record, do nothing
    const existing = await getKey<string | Record<string, unknown> | null>(`referral:${wallet}`);
    if (existing) {
      return NextResponse.json({ success: true, alreadyRecorded: true });
    }

    // Lookup referrer wallet from refCode
    const referrerWallet = await getKey<string>(`refcode:${refCode}`);
    if (!referrerWallet) {
      return NextResponse.json({ error: "RefCode not found" }, { status: 404 });
    }

    const referrer = referrerWallet.toLowerCase();

    // Block self-referral based purely on wallet + refCode pattern
    const walletLast8 = wallet.slice(-8).toLowerCase();
    if (walletLast8 === refCode || wallet === referrer) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    const payload = {
      referrer,
      createdAt: new Date().toISOString(),
    };

    // Bind referrer -> referee exactly once
    await setKey(`referral:${wallet}`, payload);

    // Increment unified referral count for referrer
    await incrKey(`refcount:${referrer}`);

    return NextResponse.json({ success: true, referrer });
  } catch (error: any) {
    console.error("Referral recording failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record referral" },
      { status: 500 },
    );
  }
}
