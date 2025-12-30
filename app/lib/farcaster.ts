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
 * Get Farcaster profile data for display purposes only
 * Used only for PFP and username - no user tracking
 * NOTE: This should be called from server-side API routes, not client-side
 */
export async function getFarcasterDisplayData(walletAddress: string): Promise<FarcasterProfile | null> {
  // This function should only be called server-side where NEYNAR_API_KEY is available
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not available - this function should be called server-side");
    return null;
  }

  const cacheKey = `farcaster_display_${walletAddress.toLowerCase()}`;
  
  // Check session cache first
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  try {
    // Step 1: Get FID by wallet address
    const fidResponse = await fetch(
      `${NEYNAR_BASE_URL}/user/bulk-by-address?addresses=${walletAddress.toLowerCase()}`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!fidResponse.ok) {
      sessionCache.set(cacheKey, null);
      return null;
    }

    const fidData = await fidResponse.json();
    const users = fidData[walletAddress.toLowerCase()] || [];
    
    if (users.length === 0) {
      sessionCache.set(cacheKey, null);
      return null;
    }

    const fid = users[0].fid;

    // Step 2: Get profile details
    const profileResponse = await fetch(
      `${NEYNAR_BASE_URL}/user/bulk?fids=${fid}`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!profileResponse.ok) {
      sessionCache.set(cacheKey, null);
      return null;
    }

    const profileData = await profileResponse.json();
    const user = profileData.users?.[0];

    if (!user) {
      sessionCache.set(cacheKey, null);
      return null;
    }

    const profile: FarcasterProfile = {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url || "",
      bio: user.profile?.bio?.text || "",
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
    };

    // Cache for session only
    sessionCache.set(cacheKey, profile);
    return profile;
  } catch (error) {
    console.error("Failed to fetch Farcaster display data:", error);
    sessionCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Verify Farcaster follow for task completion
 * Used only for task verification - no user tracking
 * NOTE: This should be called from server-side API routes, not client-side
 */
export async function verifyFarcasterFollow(walletAddress: string, targetFid: number): Promise<boolean> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not available - this function should be called server-side");
    return false;
  }

  try {
    // Get user's FID
    const fidResponse = await fetch(
      `${NEYNAR_BASE_URL}/user/bulk-by-address?addresses=${walletAddress.toLowerCase()}`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!fidResponse.ok) return false;

    const fidData = await fidResponse.json();
    const users = fidData[walletAddress.toLowerCase()] || [];
    
    if (users.length === 0) return false;

    const userFid = users[0].fid;

    // Check if user follows target
    const followResponse = await fetch(
      `${NEYNAR_BASE_URL}/following?fid=${userFid}&limit=1000`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!followResponse.ok) return false;

    const followData = await followResponse.json();
    const following = followData.users || [];
    
    return following.some((user: any) => user.fid === targetFid);
  } catch (error) {
    console.error("Failed to verify Farcaster follow:", error);
    return false;
  }
}

/**
 * Verify Farcaster engagement (like/recast) for task completion
 * Used only for task verification - no user tracking
 * NOTE: This should be called from server-side API routes, not client-side
 */
export async function verifyFarcasterEngagement(walletAddress: string, castHash: string): Promise<{ liked: boolean; recasted: boolean }> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not available - this function should be called server-side");
    return { liked: false, recasted: false };
  }

  try {
    // Get user's FID first
    const fidResponse = await fetch(
      `${NEYNAR_BASE_URL}/user/bulk-by-address?addresses=${walletAddress.toLowerCase()}`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!fidResponse.ok) return { liked: false, recasted: false };

    const fidData = await fidResponse.json();
    const users = fidData[walletAddress.toLowerCase()] || [];
    
    if (users.length === 0) return { liked: false, recasted: false };

    const userFid = users[0].fid;

    // Check likes
    const likesResponse = await fetch(
      `${NEYNAR_BASE_URL}/cast/reactions?hash=${castHash}&types=likes&limit=1000`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    let liked = false;
    if (likesResponse.ok) {
      const likesData = await likesResponse.json();
      const likes = likesData.reactions?.likes || [];
      liked = likes.some((like: any) => like.user?.fid === userFid);
    }

    // Check recasts
    const recastsResponse = await fetch(
      `${NEYNAR_BASE_URL}/cast/reactions?hash=${castHash}&types=recasts&limit=1000`,
      {
        headers: {
          "accept": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    let recasted = false;
    if (recastsResponse.ok) {
      const recastsData = await recastsResponse.json();
      const recasts = recastsData.reactions?.recasts || [];
      recasted = recasts.some((recast: any) => recast.user?.fid === userFid);
    }

    return { liked, recasted };
  } catch (error) {
    console.error("Failed to verify Farcaster engagement:", error);
    return { liked: false, recasted: false };
  }
}

/**
 * Clear session cache (useful for testing or manual refresh)
 */
export function clearFarcasterCache(): void {
  sessionCache.clear();
}