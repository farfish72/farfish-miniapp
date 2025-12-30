import { NextRequest, NextResponse } from "next/server";
import { ensureReferralEnv } from "../../../config/referral";
import { getKey, setKey } from "../../../../lib/upstash";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../../../lib/wagmi";
import { NFT_CONTRACT_ADDRESS } from "../../../constants";
import nftDropAbi from "../../../abi/nftDrop.json";
import { verifyFarcasterFollow, verifyFarcasterEngagement } from "../../../lib/farcaster";

export const dynamic = "force-dynamic";

const walletRegex = /^0x[a-fA-F0-9]{40}$/;

type VerificationBody = {
  wallet: string;
  taskId: string;
};

const FARFISH_FID = 694; // FarFISH Farcaster FID
const FARFISH_RECAST_HASH = "0xd8dccab8"; // Cast hash for like/recast verification
const FARFISH_COMMENT_HASH = "0x7c1fc4bd"; // Cast hash for comment verification

// Helper function to verify NFT ownership
const verifyNFTOwnership = async (wallet: string): Promise<boolean> => {
  if (!NFT_CONTRACT_ADDRESS) return false;

  try {
    const publicClient = getPublicClient(wagmiConfig);
    if (!publicClient) return false;

    // Check balance for token IDs 0-15 (assuming these are the valid token IDs)
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

    // Initialize fc and base objects if they don't exist
    if (!userData.fc) {
      userData.fc = {};
    }
    if (!userData.base) {
      userData.base = {};
    }

    // Initialize verification variables
    let verified = false;
    let errorMessage = "Verification failed";

    switch (taskId) {
      case "fc_follow":
        // Verify Farcaster follow - only for task verification
        if (userData.fc.follow) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Use Neynar only for verification, not tracking
        verified = await verifyFarcasterFollow(wallet, FARFISH_FID);
        if (verified) {
          userData.fc.follow = true;
        } else {
          errorMessage = "Please follow @farfish on Farcaster first, or connect your Farcaster account";
        }
        break;

      case "fc_recast":
        // Verify Farcaster like & recast - only for task verification
        if (userData.fc.recast) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Use Neynar only for verification, not tracking
        const engagement = await verifyFarcasterEngagement(wallet, FARFISH_RECAST_HASH);
        verified = engagement.liked && engagement.recasted;
        
        if (verified) {
          userData.fc.recast = true;
        } else {
          errorMessage = "Please like and recast the FarFISH announcement on Farcaster first";
        }
        break;

      case "mint_nft":
        // Verify NFT ownership via blockchain
        if (userData.mint_nft) {
          return NextResponse.json({ error: "Task already completed" }, { status: 400 });
        }
        
        // Verify actual NFT ownership on-chain
        verified = await verifyNFTOwnership(wallet);
        if (verified) {
          userData.mint_nft = true;
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