import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Fetch data from Upstash KV
    const [rank, referrals, recasts] = await Promise.all([
      redis.get(`user:${address}:rank`),
      redis.get(`user:${address}:referrals`),
      redis.get(`user:${address}:recasts`),
    ]);

    return NextResponse.json({
      rank: rank !== null ? Number(rank) : null,
      referrals: referrals !== null ? Number(referrals) : null,
      recasts: recasts !== null ? Number(recasts) : null,
    });
  } catch (error) {
    console.error('Error fetching trust anchor data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust anchor data' },
      { status: 500 }
    );
  }
}
