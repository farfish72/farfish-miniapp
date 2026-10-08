import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../lib/redis';

export const dynamic = 'force-dynamic';

interface UserData {
  steam?: {
    like_recast?: {
      completed?: boolean;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAddress = searchParams.get('address');

    if (!rawAddress) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const address = rawAddress.toLowerCase().trim();
    const redis = getRedisClient();

    // Get rank from leaderboard sorted set (ZREVRANK returns 0-indexed position)
    const rankIndex = await redis.zrevrank('leaderboard', address);
    const rank = rankIndex !== null ? rankIndex + 1 : null;

    // Get referral count from refcount:{wallet} key
    const refcountKey = `refcount:${address}`;
    const referralsRaw = await redis.get<number>(refcountKey);
    const referrals = referralsRaw ?? 0;

    // Get recasts from user:{wallet} JSON data
    let recasts = 0;
    const userKey = `user:${address}`;
    const userData = await redis.get<UserData>(userKey);
    if (userData?.steam?.like_recast?.completed === true) {
      recasts = 1;
    }

    // Get points from leaderboard score (score × 20 FRH)
    const score = await redis.zscore('leaderboard', address);
    const points = score !== null ? score * 20 : 0;

    return NextResponse.json({
      rank,
      referrals,
      recasts,
      points,
    });
  } catch (error) {
    console.error('[trust-anchor]', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust anchor data' },
      { status: 500 }
    );
  }
}