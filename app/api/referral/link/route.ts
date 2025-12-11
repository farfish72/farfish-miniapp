import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv, REFERRAL_APP_URL } from "../../../config/referral";
import { getKey } from "../../../../lib/upstash";

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
    const refRecordRaw = await getKey<string | null>(`ref:${wallet}`);
    if (!refRecordRaw) {
      return NextResponse.json({ bound: false });
    }

    let referrer = "";
    try {
      const parsed = JSON.parse(refRecordRaw as string);
      referrer = parsed?.referrer || "";
    } catch {
      referrer = typeof refRecordRaw === "string" ? refRecordRaw : "";
    }

    const refCountRaw = await getKey<number | string | null>(`refcount:${wallet}`);
    const referralsCount = Number(refCountRaw ?? 0);
    const link = `${REFERRAL_APP_URL}?ref=${wallet}`;

    return NextResponse.json({
      bound: true,
      referrer,
      link,
      referralsCount: Number.isFinite(referralsCount) ? referralsCount : 0,
    });
  } catch (error: any) {
    console.error("Referral link lookup failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to load referral link" }, { status: 500 });
  }
}

