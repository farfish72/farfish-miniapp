import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";

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
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API not configured" },
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
      { error: "Valid fid required (Farcaster Miniapp only)" },
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
        errorMessage = "Please follow @farf on Farcaster first";
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
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification service error" },
      { status: 500 }
    );
  }
}

// ----------------- Neynar helpers -----------------

async function verifyFollow(fid: number, targetFid: number): Promise<boolean> {
  const res = await fetch(
    `${NEYNAR_BASE_URL}/following?fid=${fid}&limit=200`,
    {
      headers: {
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
      },
    }
  );

  if (!res.ok) return false;

  const data = await res.json();
  return (data.users || []).some((u: any) => u.fid === targetFid);
}

async function verifyLikeAndRecast(
  fid: number,
  castHash: string
): Promise<boolean> {
  const res = await fetch(
    `${NEYNAR_BASE_URL}/cast/reactions?hash=${castHash}&types=likes,recasts&limit=200`,
    {
      headers: {
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
      },
    }
  );

  if (!res.ok) return false;

  const data = await res.json();
  const likes = data.reactions?.likes || [];
  const recasts = data.reactions?.recasts || [];

  return (
    likes.some((r: any) => r.user?.fid === fid) &&
    recasts.some((r: any) => r.user?.fid === fid)
  );
}

async function verifyComment(fid: number, castHash: string): Promise<boolean> {
  const res = await fetch(
    `${NEYNAR_BASE_URL}/cast/conversation?hash=${castHash}&type=replies&limit=200`,
    {
      headers: {
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
      },
    }
  );

  if (!res.ok) return false;

  const data = await res.json();
  const replies = data.conversation?.cast?.direct_replies || [];

  return replies.some((r: any) => r.author?.fid === fid);
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
