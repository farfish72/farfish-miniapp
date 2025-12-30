import { NextRequest, NextResponse } from "next/server";
import { getFarcasterDisplayData } from "../../../lib/farcaster";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
  
  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet address" }, { status: 400 });
  }

  try {
    const profile = await getFarcasterDisplayData(wallet);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch Farcaster profile:", error);
    return NextResponse.json({ profile: null });
  }
}