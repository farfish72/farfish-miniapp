import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * STEAM PAGE TASK STATUS ENDPOINT
 * 
 * This endpoint is READ-ONLY and NEVER performs verification.
 * It only queries stored verification results from wallet-based storage.
 * 
 * SECURITY COMPLIANCE:
 * - Does NOT call Neynar API
 * - Does NOT attempt wallet → fid resolution
 * - Only reads pre-verified results using wallet-based keys
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim().toLowerCase();
  
  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet address" }, { status: 400 });
  }

  try {
    // Import Upstash functions dynamically
    const { getKey } = await import("../../../../lib/upstash");
    
    const taskIds = ["daily_checkin", "add_miniapp", "fc_follow", "fc_like_recast", "fc_comment", "referral", "referral_milestone_5", "referral_milestone_10", "referral_milestone_30", "referral_milestone_50", "nft_mint"];
    const tasks: Record<string, boolean> = {};
    
    // Check each task's verification status using wallet-based keys
    for (const taskId of taskIds) {
      if (taskId === "daily_checkin") {
        // Special handling for fishing task - check 24-hour cooldown
        const fishingKey = `steam_fishing:${wallet}`;
        const lastFishing = await getKey(fishingKey);
        
        if (lastFishing) {
          const lastTimestamp = parseInt(lastFishing as string, 10);
          const now = Date.now();
          const timeDiff = now - lastTimestamp;
          const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          // Task is "verified" (completed) if within 24-hour cooldown
          tasks[taskId] = timeDiff < twentyFourHours;
        } else {
          // No previous fishing record, task is available
          tasks[taskId] = false;
        }
      } else {
        const verificationKey = `verified_tasks:${wallet}:${taskId}`;
        const verification = await getKey(verificationKey);
        
        // Task is verified if we have a stored verification record
        tasks[taskId] = !!verification;
      }
    }
    
    return NextResponse.json({
      wallet,
      tasks,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Failed to fetch task status:", error);
    return NextResponse.json(
      { error: "Failed to fetch task status" },
      { status: 500 }
    );
  }
}