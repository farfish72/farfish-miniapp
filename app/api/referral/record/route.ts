import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

/**
 * POST /api/referral/record
 * 
 * Records a referral relationship between two users.
 * Updates the referrer's referral count.
 * 
 * Request body:
 * {
 *   walletAddress: string (required) - The new user's wallet address
 *   referredBy: string (required) - The referrer's FID or wallet address
 * }
 * 
 * Returns:
 * - 200: Referral recorded successfully
 * - 400: Invalid request or missing required fields
 * - 409: Referral already recorded (idempotent, returns success)
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { walletAddress, referredBy } = body;

    // Input validation
    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 10) {
      return NextResponse.json(
        { error: "Invalid wallet address. Must be a valid string." },
        { status: 400 }
      );
    }

    if (!referredBy || typeof referredBy !== "string" || referredBy.length < 1) {
      return NextResponse.json(
        { error: "Invalid referredBy. Must be a valid FID or wallet address." },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase().trim();
    const normalizedReferredBy = referredBy.toLowerCase().trim();

    // Check if referral already exists
    const { data: existingProfile, error: fetchError } = await supabaseServer
      .from("profiles")
      .select("referred_by")
      .eq("wallet_address", normalizedWallet)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing referral" },
        { status: 500 }
      );
    }

    // If already referred, return success (idempotent)
    if (existingProfile?.referred_by) {
      return NextResponse.json(
        {
          success: true,
          message: "Referral already recorded",
          referredBy: existingProfile.referred_by,
        },
        { status: 200 }
      );
    }

    // Update the new user's profile with referrer
    const { error: updateError } = await supabaseServer
      .from("profiles")
      .upsert(
        {
          wallet_address: normalizedWallet,
          referred_by: normalizedReferredBy,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet_address",
        }
      );

    if (updateError) {
      console.error("Error updating referral:", updateError);
      return NextResponse.json(
        { error: "Failed to record referral" },
        { status: 500 }
      );
    }

    // Find and increment referrer's count
    // Search by wallet_address or fid
    const { data: referrer, error: referrerError } = await supabaseServer
      .from("profiles")
      .select("wallet_address, fid, referrals_completed")
      .or(`wallet_address.eq.${normalizedReferredBy},fid.eq.${normalizedReferredBy}`)
      .maybeSingle();

    if (!referrerError && referrer) {
      const newCount = (Number(referrer.referrals_completed ?? 0) + 1);

      const updateKey = referrer.wallet_address?.toLowerCase() === normalizedReferredBy
        ? "wallet_address"
        : "fid";

      const { error: incrementError } = await supabaseServer
        .from("profiles")
        .update({
          referrals_completed: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq(updateKey, normalizedReferredBy);

      if (incrementError) {
        console.error("Error incrementing referral count:", incrementError);
        // Don't fail the request if increment fails - referral is already recorded
      }
    }

    return NextResponse.json(
      {
        success: true,
        walletAddress: normalizedWallet,
        referredBy: normalizedReferredBy,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Referral record API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

