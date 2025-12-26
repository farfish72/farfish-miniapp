// app/api/rank/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Import the ABI directly as a constant
const ERC20_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Initialize Viem client
const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Cache for holder data with 5 minute TTL
let holdersCache: { address: string; balance: bigint }[] = [];
let lastUpdated = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get all FRH token holders from Covalent API
async function fetchAllHolders() {
  try {
    const apiKey = process.env.COVALENT_API_KEY;
    const tokenAddress = process.env.NEXT_PUBLIC_ERC20_TOKEN_ADDRESS?.toLowerCase();
    
    if (!apiKey || !tokenAddress) {
      throw new Error('Missing required environment variables');
    }

    const url = `https://api.covalenthq.com/v1/base-mainnet/tokens/${tokenAddress}/token_holders_v2/?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error_message || 'Failed to fetch token holders');
    }

    return data.data.items.map((holder: any) => ({
      address: holder.address,
      balance: BigInt(holder.balance),
    }));
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw error;
  }
}

// Get current rank for a specific address
async function getRankForAddress(address: string) {
  const now = Date.now();
  
  // Refresh cache if needed
  if (now - lastUpdated > CACHE_TTL || holdersCache.length === 0) {
    holdersCache = await fetchAllHolders();
    lastUpdated = now;
  }

  // Get user's balance
 const userBalance = await client.readContract({
  address: process.env.NEXT_PUBLIC_ERC20_TOKEN_ADDRESS as `0x${string}`,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [address as `0x${string}`],
  blockTag: 'latest',
  account: address as `0x${string}`,
  authorizationList: [],  // Add empty array for authorizationList
}) as bigint;

  // Create a map of addresses to balances for faster lookups
  const balanceMap = new Map<string, bigint>();
  holdersCache.forEach(h => balanceMap.set(h.address.toLowerCase(), h.balance));
  
  // Update or add user's balance
  balanceMap.set(address.toLowerCase(), userBalance);

  // Convert to array and sort
  const sortedHolders = Array.from(balanceMap.entries())
    .map(([addr, bal]) => ({ address: addr, balance: bal }))
    .sort((a, b) => {
      // First sort by balance (descending)
      if (b.balance > a.balance) return 1;
      if (b.balance < a.balance) return -1;
      
      // If balances are equal, sort by address (ascending)
      return a.address.localeCompare(b.address);
    });

  // Find user's rank (1-based index)
  const userRank = sortedHolders.findIndex(
    h => h.address.toLowerCase() === address.toLowerCase()
  ) + 1;

  return {
    rank: userRank,
    totalHolders: sortedHolders.length,
    userBalance: userBalance.toString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  try {
    const rankData = await getRankForAddress(address);
    return NextResponse.json(rankData);
  } catch (error) {
    console.error('Error getting rank:', error);
    return NextResponse.json(
      { error: 'Failed to calculate rank' },
      { status: 500 }
    );
  }
}