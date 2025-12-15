import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey } from "../../../../lib/upstash";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

type VerifyTasksBody = {
  wallet: string;
  task: "follow" | "recast";
};

/**
 * Persist referral task completion in KV.
 *
 * Expects JSON body: { wallet: string, task: "follow" | "recast" }
 * - Uses wallet from the BODY only (no headers)
 * - Uses `tasks:{wallet}` as the sole KV key
 * - Never resets completed tasks back to false once written
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

  let body: VerifyTasksBody;
  try {
    body = (await req.json()) as VerifyTasksBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawWallet = body.wallet?.trim();
  const task = body.task;

  if (!rawWallet || !walletRegex.test(rawWallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  if (task !== "follow" && task !== "recast") {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }

  const wallet = rawWallet.toLowerCase();

  try {
    // Read existing task status from KV (if any)
    const existing =
      (await getKey<{ followComplete?: boolean; recastComplete?: boolean } | null>(
        `tasks:${wallet}`,
      )) ?? {};

    // Never reset a completed task once it's true
    const followComplete = existing.followComplete === true || task === "follow";
    const recastComplete = existing.recastComplete === true || task === "recast";

    await setKey(`tasks:${wallet}`, {
      followComplete,
      recastComplete,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      followComplete,
      recastComplete,
    });
  } catch (error: any) {
    console.error("Task verification failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify tasks" },
      { status: 500 },
    );
  }
}
