import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * POST /api/daily-claim
 * 
 * Records a daily claim for a user.
 * Validates that 24 hours have passed since last claim.
 * 
 * Request body:
 * {
 *   walletAddress: string (required)
 * }
 * 
 * Returns:
 * - 200: Claim successful
 * - 400: Invalid request or wallet address missing
 * - 403: Claim not available yet (cooldown active)
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { walletAddress } = body;

    // Input validation
    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 10) {
      return NextResponse.json(
        { error: "Invalid wallet address. Must be a valid string." },
        { status: 400 }
      );
    }

    // Normalize wallet address (lowercase)
    const normalizedWallet = walletAddress.toLowerCase().trim();

    // Check current profile state
    const { data: profile, error: fetchError } = await supabaseServer
      .from("profiles")
      .select("last_daily_claim_at, daily_claim_count, monthly_claim_total")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is OK for first-time claim
      console.error("Error fetching profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch profile data" },
        { status: 500 }
      );
    }

    const lastClaimAt = profile?.last_daily_claim_at
      ? Number(profile.last_daily_claim_at)
      : 0;
    const now = Date.now();
    const elapsed = now - lastClaimAt;

    // Validate cooldown (24 hours)
    if (lastClaimAt > 0 && elapsed < DAY_MS) {
      const remainingMs = DAY_MS - elapsed;
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return NextResponse.json(
        {
          error: "Daily claim cooldown active",
          remainingHours,
          nextClaimAt: lastClaimAt + DAY_MS,
        },
        { status: 403 }
      );
    }

    // Calculate new values
    const newDailyCount = (Number(profile?.daily_claim_count ?? 0) + 1);
    const newMonthlyTotal = (Number(profile?.monthly_claim_total ?? 0) + 1);

    // Update profile with new claim
    const { error: updateError } = await supabaseServer
      .from("profiles")
      .upsert(
        {
          wallet_address: normalizedWallet,
          last_daily_claim_at: now,
          daily_claim_count: newDailyCount,
          monthly_claim_total: newMonthlyTotal,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet_address",
        }
      );

    if (updateError) {
      console.error("Error updating daily claim:", updateError);
      return NextResponse.json(
        { error: "Failed to record daily claim" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        dailyClaimCount: newDailyCount,
        monthlyClaimTotal: newMonthlyTotal,
        nextClaimAt: now + DAY_MS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Daily claim API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

