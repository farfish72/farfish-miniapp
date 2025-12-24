/**
 * DropERC1155 Mint Flow on Base (chainId 8453)
 * 
 * One-per-wallet rule enforced by checking balanceOf(address, id) for all tokenIds 0-15.
 * Mint price and currency read directly from on-chain claim conditions.
 * Random tokenId selection weighted by remaining supply (maxTotalSupply - totalSupply).
 */
"use client";

import Image from "next/image";
import Header from "./components/Header";
import useFarcasterGate from "./hooks/useFarcasterGate";
import useFarcasterEnvironment from "./hooks/useFarcasterEnvironment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "./lib/wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { NFT_CONTRACT_ADDRESS, getNameFromTokenId } from "./constants";
import nftDropAbi from "./abi/nftDrop.json";
import { base } from "viem/chains";
import { formatEther } from "viem";

interface SupplyInfo {
  id: number;
  totalSupply: bigint;
  maxTotalSupply: bigint;
  remaining: bigint;
}

interface ClaimCondition {
  startTimestamp: bigint;
  maxClaimableSupply: bigint;
  supplyClaimed: bigint;
  quantityLimitPerWallet: bigint;
  merkleRoot: `0x${string}`;
  pricePerToken: bigint;
  currency: `0x${string}`;
  metadata: string;
}

interface TokenClaimInfo {
  tokenId: number;
  condition: ClaimCondition | null;
  activeConditionId: bigint | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Weighted random selection using browser crypto API.
 * Returns the selected tokenId from candidates based on remaining supply weights.
 */
function pickWeightedTokenId(candidates: SupplyInfo[]): number {
  if (candidates.length === 0) {
    throw new Error("No candidates available");
  }

  // Calculate total weight (sum of all remaining supplies)
  const totalWeight = candidates.reduce((sum, item) => sum + item.remaining, BigInt(0));

  if (totalWeight === BigInt(0)) {
    throw new Error("All tokens are sold out");
  }

  // Generate random number using crypto API
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomValue = randomArray[0];

  // Convert to BigInt and scale to [0, totalWeight)
  // Use modulo to map random value into the weight range
  const randomBigInt = BigInt(randomValue);
  const scaledRandom = randomBigInt % totalWeight;

  // Walk through candidates to find the selected one
  let accumulated = BigInt(0);
  for (const candidate of candidates) {
    accumulated += candidate.remaining;
    if (scaledRandom < accumulated) {
      return candidate.id;
    }
  }

  // Fallback to last candidate (should not happen)
  return candidates[candidates.length - 1].id;
}

const TOKEN_IDS = Array.from({ length: 16 }, (_, i) => i); // 0-15

const EARLY_ACCESS_SHARE_TEXT = [
  "I just unlocked Early Access for FarFISH 🐟",
  "",
  "FarFISH is a daily reward ecosystem on Base.",
  "Earn daily FRH rewards, unlock 5× earnings with NFT staking,",
  "climb the leaderboard access, referrals and monthly airdrops.",
  "",
  "Early access is live 👇",
].join("\n");

const EARLY_ACCESS_SHARE_URL = "https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish";

export default function HomeClient() {
  const { blocked, message } = useFarcasterGate();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  // State
  const [supplyInfo, setSupplyInfo] = useState<SupplyInfo[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintedTokenId, setLastMintedTokenId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [mintedTokenUri, setMintedTokenUri] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState<Map<number, TokenClaimInfo>>(new Map());
  const [loadingClaimConditions, setLoadingClaimConditions] = useState(false);
  const [justMinted, setJustMinted] = useState(false);
  const [earlyUnlocked, setEarlyUnlocked] = useState(false);
  const [showEarlyPanel, setShowEarlyPanel] = useState(false);
  const [canVerify, setCanVerify] = useState(false);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, []);

  // Handle verify timing when panel is shown
  useEffect(() => {
    if (!showEarlyPanel || earlyUnlocked) return;

    const checkVerify = () => {
      const t = localStorage.getItem("earlyAccessShareTime");
      if (!t) return false;
      return Date.now() - Number(t) >= 20000;
    };

    if (checkVerify()) {
      setCanVerify(true);
      return;
    }

    const interval = setInterval(() => {
      if (checkVerify()) {
        setCanVerify(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showEarlyPanel, earlyUnlocked]);

  // Reset canVerify when panel is shown
  useEffect(() => {
    if (showEarlyPanel) {
      setCanVerify(false);
    }
  }, [showEarlyPanel]);

  // Clear timeout when verifying
  const handleVerify = useCallback(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
      verifyTimeoutRef.current = null;
    }
    localStorage.setItem("earlyAccessUnlocked", "true");
    localStorage.removeItem("earlyAccessShareTime");
    setEarlyUnlocked(true);
    setShowEarlyPanel(false);
    setCanVerify(false);
  }, []);

  // Clear timeout when panel is closed
  const handleClosePanel = useCallback(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
      verifyTimeoutRef.current = null;
    }
    setShowEarlyPanel(false);
    setCanVerify(false);
  }, []);

  const {
    writeContract: writeMint,
    data: mintTxHash,
    isPending: isMintPending,
    error: mintError,
  } = useWriteContract();
  const {
    isLoading: isMintConfirming,
    isSuccess: isMintConfirmed,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });

  const isFarcasterEnv = useFarcasterEnvironment("Home page");

  // Fetch claim conditions for a specific tokenId
  const fetchClaimCondition = useCallback(async (tokenId: number): Promise<TokenClaimInfo> => {
    if (typeof window === "undefined" || !NFT_CONTRACT_ADDRESS) {
      return {
        tokenId,
        condition: null,
        activeConditionId: null,
        isLoading: false,
        error: "Contract not available",
      };
    }

    try {
      // Use the configured Base chain from wagmi to ensure we always read from the same chain
      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      if (!publicClient) {
        return {
          tokenId,
          condition: null,
          activeConditionId: null,
          isLoading: false,
          error: "Public client not available",
        };
      }

      // DIAGNOSTIC LOGGING: Log contract address, chainId, and tokenId
      const chainId = publicClient.chain?.id;
      console.log("🔍 [DIAGNOSTIC] getActiveClaimConditionId call:", {
        tokenId,
        contractAddress: NFT_CONTRACT_ADDRESS,
        chainId: chainId,
        expectedChainId: 8453,
        chainName: publicClient.chain?.name,
        isBaseChain: chainId === 8453,
        baseChainId: base.id,
        contractFromEnv: NFT_CONTRACT_ADDRESS,
        contractFromError: "0xA10C5a76910D3B9f22CAE78a4c718bE98715339b",
        contractMatches: NFT_CONTRACT_ADDRESS.toLowerCase() === "0xA10C5a76910D3B9f22CAE78a4c718bE98715339b".toLowerCase(),
      });

      // Get active claim condition ID
      const activeConditionId = (await (publicClient.readContract as any)({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: nftDropAbi as any,
        functionName: "getActiveClaimConditionId",
        args: [BigInt(tokenId)],
      })) as bigint;

      // DIAGNOSTIC LOGGING: Log the result
      console.log("🔍 [DIAGNOSTIC] getActiveClaimConditionId result:", {
        tokenId,
        activeConditionId: activeConditionId.toString(),
        activeConditionIdNumber: Number(activeConditionId),
        contractAddress: NFT_CONTRACT_ADDRESS,
        chainId: chainId,
        isZero: activeConditionId === BigInt(0),
      });

      // If no active condition (returns 0 or throws), return error
      if (activeConditionId === BigInt(0)) {
        console.warn(`⚠️ [DIAGNOSTIC] No active claim condition for tokenId ${tokenId}`, {
          tokenId,
          activeConditionId: activeConditionId.toString(),
          contractAddress: NFT_CONTRACT_ADDRESS,
          chainId: chainId,
          expectedChainId: 8453,
          chainMismatch: chainId !== 8453,
          contractMismatch: NFT_CONTRACT_ADDRESS !== "0xA10C5a76910D3B9f22CAE78a4c718bE98715339b",
        });
        return {
          tokenId,
          condition: null,
          activeConditionId: null,
          isLoading: false,
          error: "No active claim condition",
        };
      }

      // Get claim condition details
      console.log("🔍 [DIAGNOSTIC] Calling getClaimConditionById:", {
        tokenId,
        activeConditionId: activeConditionId.toString(),
        contractAddress: NFT_CONTRACT_ADDRESS,
        chainId: chainId,
      });

      const condition = (await (publicClient.readContract as any)({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: nftDropAbi as any,
        functionName: "getClaimConditionById",
        args: [BigInt(tokenId), activeConditionId],
      })) as ClaimCondition;

      // Log claim condition for debugging
      if (condition) {
        console.log(`✅ [DIAGNOSTIC] Claim condition for tokenId ${tokenId}:`, {
          activeConditionId: activeConditionId.toString(),
          pricePerToken: condition.pricePerToken.toString(),
          currency: condition.currency,
          startTimestamp: condition.startTimestamp.toString(),
          maxClaimableSupply: condition.maxClaimableSupply.toString(),
          supplyClaimed: condition.supplyClaimed.toString(),
          quantityLimitPerWallet: condition.quantityLimitPerWallet.toString(),
          contractAddress: NFT_CONTRACT_ADDRESS,
          chainId: chainId,
        });
      }

      return {
        tokenId,
        condition,
        activeConditionId,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      const chainId = publicClient?.chain?.id;
      console.error(`❌ [DIAGNOSTIC] Failed to fetch claim condition for tokenId ${tokenId}:`, {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        tokenId,
        contractAddress: NFT_CONTRACT_ADDRESS,
        chainId: chainId,
        expectedChainId: 8453,
        chainMismatch: chainId !== 8453,
      });
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("DropNoActiveCondition") || errorMessage.includes("execution reverted")) {
        return {
          tokenId,
          condition: null,
          activeConditionId: null,
          isLoading: false,
          error: "No active claim condition on-chain",
        };
      }
      return {
        tokenId,
        condition: null,
        activeConditionId: null,
        isLoading: false,
        error: errorMessage,
      };
    }
  }, []);

  // Fetch claim conditions for all tokenIds
  const fetchAllClaimConditions = useCallback(async () => {
    if (typeof window === "undefined" || !NFT_CONTRACT_ADDRESS) return;

    setLoadingClaimConditions(true);
    try {
      const claimPromises = TOKEN_IDS.map((id) => fetchClaimCondition(id));
      const results = await Promise.all(claimPromises);
      
      const newMap = new Map<number, TokenClaimInfo>();
      results.forEach((info) => {
        newMap.set(info.tokenId, info);
      });
      setClaimInfo(newMap);
    } catch (error) {
      console.error("Failed to fetch claim conditions:", error);
    } finally {
      setLoadingClaimConditions(false);
    }
  }, [fetchClaimCondition]);

  // Fetch supply info for all tokenIds (0-15)
  const fetchSupplyInfo = useCallback(async () => {
    if (typeof window === "undefined" || !NFT_CONTRACT_ADDRESS) return;

    setLoadingSupplies(true);
    setErrorMessage(null);

    try {
      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      if (!publicClient) {
        setErrorMessage("Public client not available");
        return;
      }

      const supplyPromises = TOKEN_IDS.map(async (id) => {
        const [totalSupply, maxTotalSupply] = await Promise.all([
          (publicClient.readContract as any)({
            address: NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: nftDropAbi as any,
            functionName: "totalSupply",
            args: [BigInt(id)],
          }) as Promise<bigint>,
          (publicClient.readContract as any)({
            address: NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: nftDropAbi as any,
            functionName: "maxTotalSupply",
            args: [BigInt(id)],
          }) as Promise<bigint>,
        ]);

        const remaining = maxTotalSupply > totalSupply ? maxTotalSupply - totalSupply : BigInt(0);

        return {
          id,
          totalSupply,
          maxTotalSupply,
          remaining,
        } as SupplyInfo;
      });

      const supplies = await Promise.all(supplyPromises);
      setSupplyInfo(supplies);
    } catch (error) {
      console.error("Failed to fetch supply info:", error);
      setErrorMessage("Failed to load supply data");
    } finally {
      setLoadingSupplies(false);
    }
  }, []);

  // Check if wallet has already minted (balanceOf > 0 for any tokenId)
  const checkHasMinted = useCallback(async () => {
    if (typeof window === "undefined" || !address || !NFT_CONTRACT_ADDRESS) {
      setHasMinted(false);
      return;
    }

    try {
      const publicClient = getPublicClient(wagmiConfig, { chainId: base.id });
      if (!publicClient) {
        return;
      }

      const balancePromises = TOKEN_IDS.map((id) =>
        (publicClient.readContract as any)({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: nftDropAbi as any,
          functionName: "balanceOf",
          args: [address as `0x${string}`, BigInt(id)],
        }) as Promise<bigint>
      );

      const balances = await Promise.all(balancePromises);
      const hasAnyBalance = balances.some((balance) => balance > BigInt(0));
      setHasMinted(hasAnyBalance);

      // If user has minted, find which tokenId and fetch its URI
      if (hasAnyBalance) {
        const mintedId = balances.findIndex((balance) => balance > BigInt(0));
        if (mintedId >= 0) {
          setLastMintedTokenId(mintedId);
          try {
            const uri = (await (publicClient.readContract as any)({
              address: NFT_CONTRACT_ADDRESS as `0x${string}`,
              abi: nftDropAbi as any,
              functionName: "uri",
              args: [BigInt(mintedId)],
            })) as string;
            if (uri) {
              setMintedTokenUri(uri);
            }
          } catch {
            // URI fetch failed, continue without it
          }
        }
      }
    } catch (error) {
      console.error("Failed to check mint status:", error);
    }
  }, [address]);

  // Load early access state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('earlyAccessUnlocked');
    if (saved === 'true') {
      setEarlyUnlocked(true);
    }
  }, []);

  // Fetch supply info and claim conditions on mount and when contract address changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchSupplyInfo();
      fetchAllClaimConditions();
    }
  }, [fetchSupplyInfo, fetchAllClaimConditions]);

  // Check mint status when wallet connects or address changes
  useEffect(() => {
    if (typeof window !== "undefined" && isConnected && address) {
      checkHasMinted();
      setJustMinted(false); // Reset justMinted when wallet changes
    } else {
      setHasMinted(false);
      setLastMintedTokenId(null);
      setMintedTokenUri(null);
      setJustMinted(false);
    }
  }, [isConnected, address, checkHasMinted]);

  // Refetch after successful mint
  useEffect(() => {
    if (isMintConfirmed && mintTxHash) {
      fetchSupplyInfo();
      fetchAllClaimConditions();
      checkHasMinted();
      setIsMinting(false);
      setJustMinted(true);
      setToast({ type: "success", message: "Mint successful!" });
    }
  }, [isMintConfirmed, mintTxHash, fetchSupplyInfo, fetchAllClaimConditions, checkHasMinted]);

  // Handle mint errors
  useEffect(() => {
    if (mintError) {
      setIsMinting(false);
      const errorMsg = mintError.message || "Mint failed";
      if (errorMsg.includes("reject") || errorMsg.includes("denied") || errorMsg.includes("User rejected")) {
        setToast({ type: "error", message: "Transaction rejected" });
      } else {
        setErrorMessage(`Mint failed: ${errorMsg}`);
        setToast({ type: "error", message: `Mint failed: ${errorMsg}` });
      }
    }
  }, [mintError]);

  const handleConnect = useCallback(() => {
    const connector = connectors[0];
    if (!connector) return;
    connect({ connector });
  }, [connect, connectors]);

  const handleMint = useCallback(async () => {
    setToast(null);
    setErrorMessage(null);

    if (!NFT_CONTRACT_ADDRESS) {
      setToast({ type: "error", message: "Contract missing — mint disabled" });
      return;
    }

    if (!address || !isConnected) {
      handleConnect();
      return;
    }

    if (hasMinted) {
      setToast({ type: "error", message: "You have already minted" });
      return;
    }

    // Build candidates with remaining supply > 0 and valid claim conditions
    const candidates = supplyInfo.filter((info) => {
      if (info.remaining <= BigInt(0)) return false;
      const claim = claimInfo.get(info.id);
      if (!claim || !claim.condition) return false;
      
      // Check if mint has started
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (claim.condition.startTimestamp > now) return false;
      
      // Check if there's remaining supply in claim condition
      if (claim.condition.supplyClaimed >= claim.condition.maxClaimableSupply) return false;
      
      return true;
    });

    if (candidates.length === 0) {
      setToast({ type: "error", message: "All tokens are sold out or claim conditions not configured" });
      return;
    }

    try {
      // Select random tokenId weighted by remaining supply
      const tokenId = pickWeightedTokenId(candidates);
      const claim = claimInfo.get(tokenId);

      if (!claim || !claim.condition) {
        setToast({ type: "error", message: "Claim conditions not available for selected token" });
        return;
      }

      const { pricePerToken, currency, quantityLimitPerWallet } = claim.condition;
      const quantity = BigInt(1);

      // Verify mint has started
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (claim.condition.startTimestamp > now) {
        setToast({ type: "error", message: "Mint has not started yet" });
        return;
      }

      // Verify claim condition has remaining supply
      if (claim.condition.supplyClaimed >= claim.condition.maxClaimableSupply) {
        setToast({ type: "error", message: "Claim condition supply exhausted" });
        return;
      }

      // Calculate total value needed (pricePerToken * quantity)
      // pricePerToken is already in wei (bigint) from on-chain claim condition
      const totalValue = pricePerToken * quantity;

      // Native ETH currency address (Thirdweb-style - required for this contract)
      const NATIVE_CURRENCY = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`;
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
      
      // Check if currency is native ETH (either EEE address or zero address)
      // Contract expects EEE address for native ETH
      const isNativeCurrency = 
        currency.toLowerCase() === NATIVE_CURRENCY.toLowerCase() ||
        currency.toLowerCase() === ZERO_ADDRESS.toLowerCase();

      // Use EEE address for native ETH (as required by contract)
      // If condition has zero address, we normalize to EEE address
      // The contract's claim condition should be configured with EEE address on-chain
      const normalizedCurrency = isNativeCurrency ? NATIVE_CURRENCY : currency;

      // Prepare allowlist proof (empty for public mint)
      // IMPORTANT: pricePerToken and currency in allowlistProof must match what we send to the contract
      // We use normalized currency (EEE address) to match the contract's expectation
      const allowlistProof = {
        proof: [] as `0x${string}`[],
        quantityLimitPerWallet,
        pricePerToken, // Must match claim.condition.pricePerToken
        currency: normalizedCurrency, // Use EEE address for native ETH (matches contract expectation)
      };

      // Log claim parameters for debugging
      console.log("Calling claim() with parameters:", {
        receiver: address,
        tokenId,
        quantity: quantity.toString(),
        currency: normalizedCurrency,
        pricePerToken: pricePerToken.toString(),
        totalValue: totalValue.toString(),
        isNativeCurrency,
        msgValue: isNativeCurrency ? totalValue.toString() : "0",
        allowlistProof,
      });

      setIsMinting(true);

      // Call claim function with all required parameters
      // Contract will validate that _pricePerToken and _currency match the active claim condition
      // For native ETH, msg.value must equal pricePerToken * quantity
      writeMint({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: nftDropAbi as any,
        functionName: "claim",
        args: [
          address as `0x${string}`, // _receiver
          BigInt(tokenId), // _tokenId
          quantity, // _quantity
          normalizedCurrency, // _currency (must match condition.currency)
          pricePerToken, // _pricePerToken (must match condition.pricePerToken)
          allowlistProof, // _allowlistProof (pricePerToken and currency must match condition)
          "0x" as `0x${string}`, // _data (empty bytes)
        ],
        // Send native ETH via msg.value when currency is native
        // value field in wagmi/viem sends ETH in the transaction
        value: isNativeCurrency ? totalValue : BigInt(0),
      } as any);
    } catch (error) {
      console.error("Mint transaction failed to start", error);
      setIsMinting(false);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to start mint transaction" });
    }
  }, [address, isConnected, hasMinted, supplyInfo, claimInfo, writeMint, handleConnect]);

  // Calculate total minted and remaining across all tokenIds
  const totalMinted = useMemo(() => {
    return supplyInfo.reduce((sum, info) => sum + Number(info.totalSupply), 0);
  }, [supplyInfo]);

  const totalMaxSupply = useMemo(() => {
    return supplyInfo.reduce((sum, info) => sum + Number(info.maxTotalSupply), 0);
  }, [supplyInfo]);

  const totalRemaining = useMemo(() => {
    return Math.max(0, totalMaxSupply - totalMinted);
  }, [totalMinted, totalMaxSupply]);

  const mintedProgress = useMemo(() => {
    if (totalMaxSupply === 0) return 0;
    return Math.min(100, Math.max(0, (totalMinted / totalMaxSupply) * 100));
  }, [totalMinted, totalMaxSupply]);

  // Get representative price from claim conditions (use first available token's price)
  // Only returns price if:
  // 1. Claim condition exists and is valid
  // 2. Token has remaining supply
  // 3. Mint has started (startTimestamp <= now)
  // 4. Claim condition has remaining supply (supplyClaimed < maxClaimableSupply)
  const representativePrice = useMemo(() => {
    for (const info of supplyInfo) {
      const claim = claimInfo.get(info.id);
      if (claim?.condition && !claim.error) {
        // Check if token has remaining supply
        if (info.remaining <= BigInt(0)) continue;

        // Check if mint has started
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (claim.condition.startTimestamp > now) continue;

        // Check if claim condition has remaining supply
        if (claim.condition.supplyClaimed >= claim.condition.maxClaimableSupply) continue;

        // Return full condition (includes price and currency)
        return claim.condition;
      }
    }
    return null;
  }, [supplyInfo, claimInfo]);

  const priceDisplay = useMemo(() => {
    if (!representativePrice) return null;

    try {
      const { pricePerToken, currency } = representativePrice;
      const ethLikeAddresses = [
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "0x0000000000000000000000000000000000000000",
      ];
      const isEth =
        ethLikeAddresses.includes(currency.toLowerCase());

      const symbol = isEth ? "ETH" : "TOKEN";
      const formattedPrice = formatEther(pricePerToken);

      return { formattedPrice, symbol };
    } catch {
      return null;
    }
  }, [representativePrice]);

  // Button states and labels - only: Mint, Minted, Already Minted
  const primaryButtonLabel = useMemo(() => {
    if (hasMinted) {
      // Show "Minted" if just confirmed, otherwise "Already Minted"
      if (justMinted || isMintConfirmed) return "Minted";
      return "Already Minted";
    }
    return "Mint";
  }, [hasMinted, isMintConfirmed, justMinted]);

  const primaryButtonClasses = useMemo(() => {
    if (!NFT_CONTRACT_ADDRESS) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/10 text-white/50 cursor-not-allowed";
    }
    if (!address || !isConnected) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/15 text-white hover:bg-white/25 transition";
    }
    if (hasMinted) {
      return "w-full py-4 text-lg font-semibold rounded-xl bg-white/10 text-white/50 cursor-not-allowed";
    }
    return "w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black transition disabled:opacity-60";
  }, [address, isConnected, hasMinted]);

  const primaryButtonDisabled =
    isConnecting ||
    isMinting ||
    isMintPending ||
    isMintConfirming ||
    !NFT_CONTRACT_ADDRESS ||
    hasMinted ||
    loadingSupplies ||
    loadingClaimConditions ||
    representativePrice === null;

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const GALLERY_IMAGES = useMemo(
    () => ["/fish1.jpg", "/fish2.jpg", "/fish3.jpg", "/fish4.jpg"],
    [],
  );

  const lastMintedDisplay = useMemo(() => {
    if (lastMintedTokenId === null) return null;
    const name = getNameFromTokenId(lastMintedTokenId);
    return name ?? "Minted FarFISH";
  }, [lastMintedTokenId]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Home" />

      <div className="mt-4 flex-1 flex flex-col">
        {/* COMPARISON – SINGLE MAIN CONTAINER */}
<div className="w-full mb-6">
  <h2 className="text-xl font-bold mb-4">Choose Your Place</h2>

  {/* ONE MAIN BOX */}
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <div className="grid grid-cols-2 gap-4">

      {/* LEFT – BASIC */}
      <div className="bg-black/20 border border-white/10 rounded-xl p-4">
        <div className="text-white/70 text-xs mb-2">Casual users</div>

        <h3 className="text-lg font-bold mb-3">Basic</h3>

        <ul className="space-y-2 text-sm text-white/80">
          <li>• Earn 3 FRH per day</li>
          <li>• No multiplier</li>
          <li>• No staking rewards</li>
          <li>• Standard access</li>
        </ul>
      </div>

      {/* RIGHT – PREMIUM */}
      <div className="relative">
        <div className="bg-black/30 border border-[#00d4c4]/30 rounded-xl p-4 h-full">
          <div className="text-[#00d4c4] text-xs mb-2">Core users</div>

          <h3 className="text-lg font-bold mb-3">Premium</h3>

          <ul className="space-y-2 text-sm">
            <li>• Earn 9 FRH per day</li>
            <li>• Rewards multiplier unlocked</li>
            <li>• Staking rewards enabled</li>
            <li>• Monthly airdrop access</li>
            <li>• Priority ecosystem access</li>
          </ul>
        </div>

        {/* POWER PICK – OUTSIDE PREMIUM */}
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] text-xs font-bold text-black px-3 py-1 rounded-full">
          Power Pick
        </div>
      </div>

    </div>
  </div>
</div>
        {/* MINT CARD */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 w-full">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Mint FarFISH NFTs</h2>
              <p className="text-xs text-white/60">
                Total supply: {totalMaxSupply || "—"} • Species: Bluefin, GoldRay, RedSpike, ShadowGill
              </p>
            </div>
          </div>

          {!NFT_CONTRACT_ADDRESS && (
            <div className="w-full mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-200">
              Mint disabled — contract address is not configured.
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <p className="text-xs text-white/60">Minted</p>
              <p className="font-bold">{loadingSupplies ? "—" : totalMinted}</p>
              {errorMessage && (
                <p className="text-[11px] text-red-300 mt-1">Supply data unavailable</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/60">Progress</p>
              <p className="font-bold">
                {loadingSupplies ? "—" : `${mintedProgress.toFixed(2)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Remaining</p>
              <p className="font-bold">{loadingSupplies ? "—" : totalRemaining}</p>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d4c4] to-[#80ffd1]"
              style={{ width: `${mintedProgress}%` }}
            />
          </div>

          {/* PRIMARY ACTION BUTTON */}
          {blocked ? (
            <div className="w-full space-y-3">
              <div className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-center text-xs font-semibold text-red-400">
                {message}
              </div>
              <button
                onClick={() => connect({ connector: farcasterMiniApp() })}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="w-full mt-4">
              <button
                type="button"
                onClick={earlyUnlocked ? handleMint : () => {
                  setShowEarlyPanel(true);
                  setCanVerify(false);
                }}
                disabled={earlyUnlocked && (isConnecting || isMinting || isMintPending || isMintConfirming || !NFT_CONTRACT_ADDRESS || hasMinted || loadingSupplies || loadingClaimConditions || representativePrice === null)}
                className={primaryButtonClasses}
              >
                {earlyUnlocked ? "Mint" : "Unlock Early Access"}
              </button>
              
              {showEarlyPanel && !earlyUnlocked && (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg relative">
                  <button 
                    onClick={handleClosePanel}
                    className="absolute top-2 right-2 text-white/50 hover:text-white"
                  >
                    ×
                  </button>
                  <div className="whitespace-pre-line text-sm mb-4">
                    {EARLY_ACCESS_SHARE_TEXT}
                    {"\n"}
                    {EARLY_ACCESS_SHARE_URL}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={async () => {
                        try {
                          localStorage.setItem("earlyAccessShareTime", Date.now().toString());
                          
                          await sdk.actions.composeCast({
                            text: EARLY_ACCESS_SHARE_TEXT,
                            embeds: [EARLY_ACCESS_SHARE_URL],
                            close: false,
                          });
                        } catch (err) {
                          console.error("Failed to open Farcaster composer", err);
                        }
                      }}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                      disabled={canVerify}
                    >
                      {canVerify ? 'Sharing...' : 'Share on Farcaster'}
                    </button>
                    {canVerify && (
                      <button
                        onClick={handleVerify}
                        className="w-full py-2 bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-semibold rounded-lg"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              )}
              {lastMintedDisplay && (
                <p className="mt-2 text-xs text-green-400">
                  Minted: {lastMintedDisplay}
                  {mintedTokenUri && (
                    <a
                      href="/profile"
                      className="ml-2 underline"
                    >
                      View NFT
                    </a>
                  )}
                </p>
              )}
              {isMintConfirmed && (
                <p className="mt-2 text-xs text-green-400">
                  Mint transaction confirmed on-chain.
                </p>
              )}
            </div>
          )}

          {/* SHARE BUTTON */}
          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText("https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish");
                setToast({ type: "success", message: "Farcaster link copied" });
              }}
              disabled={!isConnected || !address}
              className="w-full bg-white/10 text-white py-3 rounded-lg text-sm transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share
            </button>
            {/* PRICE TEXT */}
            <p className="text-xs text-white/70 text-center mt-2">
              {priceDisplay
                ? `You have to pay ${priceDisplay.formattedPrice} ${priceDisplay.symbol} + gas`
                : "Mint price is loading. Please wait..."}
            </p>
          </div>

          {toast && (
            <div
              className={`mt-3 text-xs font-semibold rounded-lg border p-3 ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                  : "bg-red-500/10 border-red-500/20 text-red-200"
              }`}
            >
              {toast.message}
            </div>
          )}
        </div>

        {/* WHY MINT */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-3">Why mint a FarFISH?</h3>
          <ul className="text-sm text-white/80 space-y-3">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🎮</span>
              <div>
                <div className="font-medium">Upcoming Games & Play-to-Earn Mechanics</div>
                <div className="text-white/60">FarFISH NFTs will be used inside future in-app games where ownership unlocks gameplay advantages.</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🧩</span>
              <div>
                <div className="font-medium">NFT-Based Progression System</div>
                <div className="text-white/60">Your NFT is a permanent on-chain asset designed to evolve with future features.</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🌊</span>
              <div>
                <div className="font-medium">Built for Farcaster & Base</div>
                <div className="text-white/60">Designed specifically for social + on-chain interaction inside the Base ecosystem.</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">⏳</span>
              <div>
                <div className="font-medium">Long-Term Utility, Not Just Art</div>
                <div className="text-white/60">Minting is about access, progression, and participation — not visuals.</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🏆</span>
              <div>
                <div className="font-medium">Early Holders Go First</div>
                <div className="text-white/60">NFT holders get early access to new features, games, and experiments.</div>
              </div>
            </li>
          </ul>
        </div>

        {/* COLLECTION PREVIEW */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-2">Collection Preview</h3>
          <div className="grid grid-cols-2 gap-3">
            {GALLERY_IMAGES.map((src, idx) => (
              <div
                key={src}
                className="relative bg-white/10 rounded-lg aspect-square overflow-hidden"
              >
                <Image
                  src={src}
                  alt={`Artwork ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
