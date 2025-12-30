import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey } from "../../../../lib/upstash";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../../../lib/wagmi";
import { NFT_CONTRACT_ADDRESS, STAKING_CONTRACT_ADDRESS } from "../../../constants";
import nftDropAbi from "../../../abi/nftDrop.json";
import stakeAbi from "../../../abi/stake.json";
import { verifyFarcasterFollow, verifyFarcasterEngagement, verifyFarcasterComment } from "../../../lib/farcaster";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

type VerificationBody = {
  wallet: string;
  taskId: string;
};

const FARFISH_FID = 1481106; // FarFISH Farcaster FID
const FARFISH_RECAST_HASH = "0xd8dccab8"; // Cast hash for like/recast verification
const FARFISH_COMMENT_HASH = "0x7c1fc4bd"; // Cast hash for comment verification

// Helper function to verify NFT ownership or staking
const verifyNFTOwnership = async (wallet: string): Promise<boolean> => {
  if (!NFT_CONTRACT_ADDRESS) return false;

  try {
    const publicClient = getPublicClient(wagmiConfig);
    if (!publicClient) return false;

    // Check NFT balance for token IDs 0-15
    for (let tokenId = 0; tokenId <= 15; tokenId++) {
      try {
        const balance = await (publicClient.readContract as any)({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: nftDropAbi as any,
          functionName: "balanceOf",
          args: [wallet as `0x${string}`, BigInt(tokenId)],
        }) as bigint;

        if (balance && Number(balance) > 0) {
          return true;
        }
      } catch {
        // Continue checking other token IDs
      }
    }

    // Check staking - if user has any active stakes
    if (STAKING_CONTRACT_ADDRESS) {
      try {
        const stakeIds = await (publicClient.readContract as any)({
          address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
          abi: stakeAbi as any,
          functionName: "getUserStakeIds",
          args: [wallet as `0x${string}`],
        }) as bigint[];

        // Check if user has any stake IDs in valid range (0-50000)
        for (const stakeId of stakeIds) {
          const stakeIdNum = Number(stakeId);
          if (stakeIdNum >= 0 && stakeIdNum <= 50000) {
            // Verify the stake is still active (not unstaked)
            try {
              const stakeInfo = await (publicClient.readContract as any)({
                address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
                abi: stakeAbi as any,
                functionName: "getStakeInfo",
                args: [stakeId],
              }) as any;

              // If stake exists and is not unstaked, user qualifies
              if (stakeInfo && !stakeInfo.unstaked) {
                return true;
              }
            } catch {
              // Continue checking other stakes
            }
          }
        }
      } catch {
        // Staking check failed, but NFT check already passed or failed above
      }
    }

    return false;
  } catch (error) {
    console.error("NFT ownership verification failed:", error);
    return false;
  }
};

export async function POST(req: NextRequest) {
  let body: VerificationBody;
  try {
    body = (await req.json()) as VerificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim().toLowerCase();
  const taskId = body.taskId?.trim();

  if (!wallet || !walletRegex.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 });
  }

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  try {
    ensureReferralEnv();
  } catch (error: any) {
    return NextResponse.json({ error: "Verification unavailable" }, { status: 500 });
  }

  try {
    // Get current user data
    const userDataRaw = await getKey<string | Record<string, unknown> | null>(`user:${wallet}`);
    let userData: Record<string, any> = {};

    if (userDataRaw) {
      if (typeof userDataRaw === "string") {
        try {
          userData = JSON.parse(userDataRaw);
        } catch {
          userData = {};
        }
      } else if (typeof userDataRaw === "object" && userDataRaw !== null) {
        userData = { ...userDataRaw };
      }
    }

    // Initialize tasks object if it doesn't exist
    if (!userData.tasks) {
      userData.tasks = {};
    }

    // Initialize verification variables
    let verified = false;
    let errorMessage = "Verification failed";

    switch (taskId) {
      case "fc_follow":
        // Verify Farcaster follow - only for task verification
        if (userData.tasks?.fc_follow) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Use Neynar only for verification, not tracking
        verified = await verifyFarcasterFollow(wallet, FARFISH_FID);
        if (verified) {
          if (!userData.tasks) userData.tasks = {};
          userData.tasks.fc_follow = true;
        } else {
          errorMessage = "Please follow @farf on Farcaster first, or connect your Farcaster account";
        }
        break;

      case "fc_like_recast":
        // Verify Farcaster like & recast - only for task verification
        if (userData.tasks?.fc_like_recast) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Use Neynar only for verification, not tracking
        const engagement = await verifyFarcasterEngagement(wallet, FARFISH_RECAST_HASH);
        verified = engagement.liked && engagement.recasted;
        
        if (verified) {
          if (!userData.tasks) userData.tasks = {};
          userData.tasks.fc_like_recast = true;
        } else {
          errorMessage = "Please like and recast the FarFISH announcement on Farcaster first";
        }
        break;

      case "fc_comment":
        // Verify Farcaster comment - check for at least one comment
        if (userData.tasks?.fc_comment) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Use Neynar to verify comment on specific cast
        const commentVerified = await verifyFarcasterComment(wallet, "0x7c1fc4bd");
        if (commentVerified) {
          if (!userData.tasks) userData.tasks = {};
          userData.tasks.fc_comment = true;
          verified = true;
        } else {
          errorMessage = "Please comment on the FarFISH announcement on Farcaster first";
        }
        break;

      case "nft_mint":
        // Verify NFT ownership via blockchain
        if (userData.tasks?.nft_mint) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Verify actual NFT ownership on-chain
        verified = await verifyNFTOwnership(wallet);
        if (verified) {
          if (!userData.tasks) userData.tasks = {};
          userData.tasks.nft_mint = true;
        } else {
          errorMessage = "No FarFISH NFT found in your wallet";
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    if (!verified) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Save updated user data
    await setKey(`user:${wallet}`, userData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Task verification failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}