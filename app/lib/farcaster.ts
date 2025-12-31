// app/lib/farcaster.ts
"use client";

// Note: This will be undefined on client-side, which is correct for security
// Neynar API calls should only happen server-side
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";

export type FarcasterProfile = {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
};

// Simple cache for session-only storage (no persistence)
const sessionCache = new Map<string, any>();

/**
 * DEPRECATED: This function violates Farcaster security model
 * 
 * SECURITY VIOLATION: Attempts to resolve wallet → fid, which is forbidden.
 * Wallet address is NOT a Farcaster identity.
 * 
 * This function is kept for backward compatibility with existing display code,
 * but should NOT be used for any verification purposes.
 * 
 * For secure Farcaster verification, use the /api/farcaster/verify endpoint
 * which only accepts fid from Farcaster Miniapp context.
 */
export async function getFarcasterDisplayData(walletAddress: string): Promise<FarcasterProfile | null> {
  console.warn("DEPRECATED: getFarcasterDisplayData violates Farcaster security model");
  console.warn("This function attempts wallet → fid resolution which is forbidden");
  console.warn("Use Farcaster Miniapp context for secure fid access");
  
  // Return null to prevent any wallet → fid resolution
  return null;
}

/**
 * DEPRECATED VERIFICATION FUNCTIONS
 * 
 * These functions violate the Farcaster security model by attempting
 * wallet → fid resolution. They are kept for backward compatibility
 * but should NOT be used.
 * 
 * For secure verification, use /api/farcaster/verify which only accepts
 * fid from Farcaster Miniapp context.
 */

export async function verifyFarcasterFollow(wallet: string, targetFid: number): Promise<boolean> {
  console.warn("DEPRECATED: verifyFarcasterFollow violates security model");
  console.warn("Use /api/farcaster/verify with fid from Miniapp context");
  return false;
}

export async function verifyFarcasterEngagement(wallet: string, castHash: string): Promise<{ liked: boolean; recasted: boolean }> {
  console.warn("DEPRECATED: verifyFarcasterEngagement violates security model");
  console.warn("Use /api/farcaster/verify with fid from Miniapp context");
  return { liked: false, recasted: false };
}

export async function verifyFarcasterComment(wallet: string, castHash: string): Promise<boolean> {
  console.warn("DEPRECATED: verifyFarcasterComment violates security model");
  console.warn("Use /api/farcaster/verify with fid from Miniapp context");
  return false;
}

/**
 * Clear session cache (useful for testing or manual refresh)
 */
export function clearFarcasterCache(): void {
  sessionCache.clear();
}