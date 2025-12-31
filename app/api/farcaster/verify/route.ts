import { NextRequest, NextResponse } from "next/server";
import { verifyFollow, verifyLikeAndRecast, verifyComment } from "../../../../lib/neynar";

export const dynamic = "force-dynamic";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;

// FarFISH constants
const FARFISH_FID = 1481106;
const FARFISH_RECAST_HASH = "0xd8dccab8";
const FARFISH_COMMENT_HASH = "0x7c1fc4bd";

type VerificationRequest = {
  fid: number;
  taskId: string;
  wallet: string;
};

/**
 * SECURE FARCASTER VERIFICATION ENDPOINT
 *
 * RULES:
 * - Accepts fid (for Neynar verification) + wallet (for storage)
 * - Uses Neynar ONLY to verify Farcaster actions with fid
 * - Stores verification results keyed by wallet address
 * - Wallet owns rewards, fid proves actions
 */
export async function POST(req: NextRequest) {
  // STEP 1: Mandatory ENV check with clear runtime error
  if (!NEYNAR_API_KEY) {
    console.error("[NEYNAR] NEYNAR_API_KEY is not configured");
    return NextResponse.json(
      { error: "NEYNAR_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: VerificationRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { fid, taskId, wallet } = body;

  if (!fid || typeof fid !== "number" || fid <= 0) {
    return NextResponse.json(
      { error: "Valid fid required (Social platform only)" },
      { status: 400 }
    );
  }

  if (!taskId || typeof taskId !== "string") {
    return NextResponse.json(
      { error: "Valid taskId required" },
      { status: 400 }
    );
  }

  if (!wallet || typeof wallet !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json(
      { error: "Valid wallet address required" },
      { status: 400 }
    );
  }

  try {
    let verified = false;
    let errorMessage = "Verification failed";

    switch (taskId) {
      case "fc_follow":
        verified = await verifyFollow(fid, FARFISH_FID);
        errorMessage = "Please follow @farf on the platform first";
        break;

      case "fc_like_recast":
        verified = await verifyLikeAndRecast(fid, FARFISH_RECAST_HASH);
        errorMessage = "Please like and recast the announcement first";
        break;

      case "fc_comment":
        verified = await verifyComment(fid, FARFISH_COMMENT_HASH);
        errorMessage = "Please comment on the announcement first";
        break;

      default:
        return NextResponse.json(
          { error: "Unknown task type" },
          { status: 400 }
        );
    }

    if (!verified) {
      return NextResponse.json(
        { verified: false, error: errorMessage },
        { status: 400 }
      );
    }

    await storeVerificationResult(wallet, taskId);

    return NextResponse.json({
      verified: true,
      wallet,
      taskId,
    });
  } catch (error) {
    console.error("[NEYNAR] Verification error:", error);
    
    // STEP 5: Fail fast with clear error message
    if (error instanceof Error && error.message.includes("Farcaster verification unavailable")) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Farcaster verification unavailable" },
      { status: 500 }
    );
  }
}

// ----------------- Storage -----------------

async function storeVerificationResult(wallet: string, taskId: string) {
  const { setKey } = await import("../../../../lib/upstash");

  const key = `verified_tasks:${wallet.toLowerCase()}:${taskId}`;

  await setKey(key, {
    wallet: wallet.toLowerCase(),
    taskId,
    verified: true,
    timestamp: new Date().toISOString(),
  });
}
