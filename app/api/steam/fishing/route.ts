import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * FISHING TASK ENDPOINT
 * 
 * Handles the fishing check-in task with 24-hour cooldown using Upstash KV storage.
 * Records the action and enforces once-per-24-hours logic.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.trim().toLowerCase();
    
    if (!wallet || !walletRegex.test(wallet)) {
      return NextResponse.json({ error: "Missing or invalid wallet address" }, { status: 400 });
    }

    // Import Upstash functions dynamically
    const { getKey, setKey } = await import("../../../../lib/upstash");
    
    const fishingKey = `steam_fishing:${wallet}`;
    const now = Date.now();
    
    // Check if user has already completed fishing in the last 24 hours
    const lastFishing = await getKey(fishingKey);
    
    if (lastFishing) {
      const lastTimestamp = parseInt(lastFishing as string, 10);
      const timeDiff = now - lastTimestamp;
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (timeDiff < twentyFourHours) {
        const remainingTime = twentyFourHours - timeDiff;
        const hoursRemaining = Math.ceil(remainingTime / (60 * 60 * 1000));
        
        return NextResponse.json({
          success: false,
          error: `Fishing cooldown active. Try again in ${hoursRemaining} hours.`,
          cooldownRemaining: remainingTime
        }, { status: 429 });
      }
    }
    
    // Record the fishing action with current timestamp
    await setKey(fishingKey, now.toString());
    
    // Mark the daily_checkin task as verified for today
    const verificationKey = `verified_tasks:${wallet}:daily_checkin`;
    await setKey(verificationKey, now.toString());
    
    return NextResponse.json({
      success: true,
      message: "Fishing completed successfully!",
      timestamp: now,
      reward: 10
    });
    
  } catch (error) {
    console.error("Fishing check-in error:", error);
    return NextResponse.json(
      { error: "Failed to complete fishing check-in" },
      { status: 500 }
    );
  }
}