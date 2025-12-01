import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

/**
 * POST /api/staked/record
 * 
 * Records or updates a staking position.
 * Used when NFTs are staked on-chain and need to be synced to the database.
 * 
 * Request body:
 * {
 *   walletAddress: string (required)
 *   tokenId: number (required)
 *   tokenTier: number (optional, defaults to 0)
 *   lockDays: number (required, must be 30, 90, 180, or 360)
 *   imageUrl?: string (optional)
 * }
 * 
 * Returns:
 * - 200: Staking position recorded successfully
 * - 400: Invalid request or missing required fields
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { walletAddress, tokenId, tokenTier, lockDays, imageUrl } = body;

    // Input validation
    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 10) {
      return NextResponse.json(
        { error: "Invalid wallet address. Must be a valid string." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(tokenId) || tokenId < 0) {
      return NextResponse.json(
        { error: "Invalid tokenId. Must be a non-negative integer." },
        { status: 400 }
      );
    }

    const validLockDays = [30, 90, 180, 360];
    if (!Number.isInteger(lockDays) || !validLockDays.includes(Number(lockDays))) {
      return NextResponse.json(
        {
          error: `Invalid lockDays. Must be one of: ${validLockDays.join(", ")}`,
          received: lockDays,
        },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase().trim();
    const normalizedTokenTier = Number.isInteger(tokenTier) ? Number(tokenTier) : 0;
    const normalizedLockDays = Number(lockDays);
    const normalizedTokenId = Number(tokenId);
    const stakedAt = Date.now();

    // Upsert staking position
    const { data, error: upsertError } = await supabaseServer
      .from("staking_positions")
      .upsert(
        {
          wallet_address: normalizedWallet,
          token_id: normalizedTokenId,
          token_tier: normalizedTokenTier,
          lock_days: normalizedLockDays,
          staked_at: stakedAt,
          image_url: imageUrl || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet_address,token_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Error recording staking position:", upsertError);
      return NextResponse.json(
        { error: "Failed to record staking position" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stakingPosition: {
          walletAddress: normalizedWallet,
          tokenId: normalizedTokenId,
          tokenTier: normalizedTokenTier,
          lockDays: normalizedLockDays,
          stakedAt,
          unlockAt: stakedAt + normalizedLockDays * 24 * 60 * 60 * 1000,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Staked record API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

