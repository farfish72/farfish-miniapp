import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv, REFERRAL_APP_URL } from "../../../config/referral";
import { getKey, setKey } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Missing required environment variables" }, { status: 500 });
  }

  const userFromHeader = req.headers.get("x-user-wallet")?.trim();
  const userFromQuery = req.nextUrl.searchParams.get("user")?.trim();
  const wallet = (userFromHeader || userFromQuery || "").toLowerCase();

  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  try {
    // Generate refCode from wallet (last 8 chars) - this is the username
    const refCode = wallet.slice(-8).toLowerCase();

    // Store refCode -> wallet mapping for lookup (KV stores full wallet)
    await setKey(`refcode:${refCode}`, wallet);

    const refRecordRaw = await getKey<string | null>(`ref:${wallet}`);
    
    let referrer = "";
    let bound = false;

    if (refRecordRaw) {
      bound = true;
      try {
        const parsed = JSON.parse(refRecordRaw as string);
        referrer = parsed?.referrer || "";
      } catch {
        referrer = typeof refRecordRaw === "string" ? refRecordRaw : "";
      }
    }

    // Get verified referral count (only counts verified referrals)
    const verifiedCountRaw = await getKey<number | string | null>(`verified_refcount:${wallet}`);
    const referralsCount = Number(verifiedCountRaw ?? 0);
    
    // Use correct referral link format: https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish?ref=XXXXXXXX
    // Where XXXXXXXXX = last 8 characters of wallet (username)
    const link = `https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish?ref=${refCode}`;

    return NextResponse.json({
      bound,
      referrer,
      link,
      referralsCount: Number.isFinite(referralsCount) ? referralsCount : 0,
    });
  } catch (error: any) {
    console.error("Referral link lookup failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to load referral link" }, { status: 500 });
  }
}

