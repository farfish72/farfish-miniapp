import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * STEAM TASK COMPLETION ENDPOINT
 * 
 * Handles completion of Steam tasks by writing to Upstash KV storage.
 * Uses the authoritative data model: user:{wallet} -> steam.{task}.completed/ts
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = body.wallet?.trim().toLowerCase();
    const taskId = body.taskId?.trim();
    
    if (!wallet || !walletRegex.test(wallet)) {
      return NextResponse.json({ error: "Missing or invalid wallet address" }, { status: 400 });
    }

    if (!taskId || !["fishing", "add_app", "follow", "like_recast", "comment"].includes(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Import Upstash functions dynamically
    const { getKey, setKey } = await import("../../../../../lib/upstash");
    
    const userKey = `user:${wallet}`;
    const now = Math.floor(Date.now() / 1000); // UNIX timestamp
    
    // Get existing user data or create new structure
    let userData = await getKey(userKey);
    let userObj: any = {};
    
    if (userData) {
      try {
        userObj = typeof userData === 'string' ? JSON.parse(userData) : userData;
      } catch {
        userObj = {};
      }
    }
    
    // Initialize steam structure if it doesn't exist
    if (!userObj.steam) {
      userObj.steam = {};
    }
    
    // Mark task as completed using the authoritative data model
    userObj.steam[taskId] = {
      completed: true,
      ts: now
    };
    
    // Save updated user data
    await setKey(userKey, JSON.stringify(userObj));
    
    return NextResponse.json({
      success: true,
      message: "Task completed successfully",
      taskId: taskId,
      timestamp: now
    });
    
  } catch (error) {
    console.error("Task completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}