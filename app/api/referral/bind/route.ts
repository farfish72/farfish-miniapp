import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, incrKey, sadd, setKey } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

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

  let body: { referrer?: string } = {};
  try {
    body = (await req.json()) as { referrer?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const referrer = body.referrer?.trim();
  if (!referrer || !walletRegex.test(referrer)) {
    return NextResponse.json({ error: "Invalid referrer address" }, { status: 400 });
  }

  try {
    const existing = await getKey<string>(`ref:${callerWallet.toLowerCase()}`);
    if (existing) {
      return NextResponse.json({ error: "Already bound" }, { status: 409 });
    }

    const payload = {
      referrer: referrer.toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    await setKey(`ref:${callerWallet.toLowerCase()}`, payload);
    await incrKey(`refcount:${referrer.toLowerCase()}`);
    await sadd("set:referrers", referrer.toLowerCase());

    return NextResponse.json({ success: true, referrer: payload.referrer });
  } catch (error: any) {
    console.error("Referral bind failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to bind referral" }, { status: 500 });
  }
}

