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

  let body: { referrer?: string; refCode?: string } = {};
  try {
    body = (await req.json()) as { referrer?: string; refCode?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let referrer: string | null = null;

  // Support both refCode and full wallet address
  if (body.refCode) {
    const refCode = body.refCode.trim().toLowerCase();
    if (refCode.length !== 8) {
      return NextResponse.json({ error: "Invalid refCode" }, { status: 400 });
    }
    // Lookup wallet from refCode
    const walletFromCode = await getKey<string>(`refcode:${refCode}`);
    if (!walletFromCode) {
      return NextResponse.json({ error: "RefCode not found" }, { status: 404 });
    }
    referrer = walletFromCode;
  } else if (body.referrer) {
    referrer = body.referrer.trim();
    if (!walletRegex.test(referrer)) {
      return NextResponse.json({ error: "Invalid referrer address" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Missing referrer or refCode" }, { status: 400 });
  }

  referrer = referrer.toLowerCase();

  // Block self-referral
  if (callerWallet.toLowerCase() === referrer) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  try {
    const existing = await getKey<string>(`ref:${callerWallet.toLowerCase()}`);
    if (existing) {
      return NextResponse.json({ error: "Already bound" }, { status: 409 });
    }

    const payload = {
      referrer: referrer,
      createdAt: new Date().toISOString(),
    };

    await setKey(`ref:${callerWallet.toLowerCase()}`, payload);
    
    // Note: We don't increment refcount here - only increment when tasks are verified
    // This will be handled by the task verification API
    await sadd("set:referrers", referrer);

    return NextResponse.json({ success: true, referrer: payload.referrer });
  } catch (error: any) {
    console.error("Referral bind failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to bind referral" }, { status: 500 });
  }
}

