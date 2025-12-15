import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey } from "../../../../lib/upstash";

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
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Missing required environment variables" },
      { status: 500 },
    );
  }

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

    await setKey(`referral:${wallet}`, payload);

    return NextResponse.json({ success: true, referrer });
  } catch (error: any) {
    console.error("Referral recording failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record referral" },
      { status: 500 },
    );
  }
}
