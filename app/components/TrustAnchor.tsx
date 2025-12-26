// app/components/TrustAnchor.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface TrustAnchorProps {
  streak: number | null;          // From localStorage (ff_streak)
  claimedToday: number;           // From on-chain (Claim Controller)
  holding: bigint | null;         // From ERC20 balanceOf (now using bigint)
  referrals: number | null;       // From Upstash KV
  recasts: number | null;         // From Upstash KV
  isLoading?: boolean;            // Loading state
  error?: string | null;          // Error message if any
}

export default function TrustAnchor({
  streak,
  claimedToday,
  holding,
  referrals,
  recasts,
  isLoading: propIsLoading = false,
  error: propError = null,
}: TrustAnchorProps) {
  const { address } = useAccount();
  const [rank, setRank] = useState<number | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const isLoading = propIsLoading || isLoadingRank;
  const error = propError || rankError;

  // Format number with commas
  const formatNumber = (num: number | null): string => {
    return num !== null ? num.toLocaleString() : '—';
  };

  // Format FRH balance (dividing by 1e18 for display)
  const formatFRH = (wei: bigint | null): string => {
    if (wei === null) return '—';
    const frh = Number(wei) / 1e18;
    return frh.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Status is derived from claimedToday
  const status = claimedToday > 0 ? 'Active' : 'Inactive';

  // Fetch rank function that can be called from multiple places
  const fetchRank = useCallback(async () => {
    if (!address) {
      setRank(null);
      return;
    }

    setIsLoadingRank(true);
    setRankError(null);
    
    try {
      const response = await fetch(`/api/rank?address=${address}`);
      const data = await response.json();
      
      // Handle both error and success cases with 200 status
      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'Failed to fetch rank');
      }
      
      // Only set rank if we have a valid number, otherwise keep as null
      setRank(typeof data.rank === 'number' ? data.rank : null);
    } catch (err) {
      console.error('Error fetching rank:', err);
      // Don't set error state, just keep rank as null
      setRank(null);
    } finally {
      setIsLoadingRank(false);
    }
  }, [address]);

  // Initial fetch when component mounts or address changes
  useEffect(() => {
    // Add a small delay to prevent rapid requests
    const timer = setTimeout(fetchRank, 500);
    return () => clearTimeout(timer);
  }, [fetchRank]);

  // Retry rank fetch when wallet connects or balance changes
  useEffect(() => {
    if (address && holding !== null) {
      const timer = setTimeout(() => {
        fetchRank();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [address, holding, fetchRank]);

  const getRankDisplay = () => {
    if (isLoadingRank) return '👑 Calculating...';
    if (rank === null) return '👑 Calculating...';
    if (rank === 0) return '👑 Unranked';
    return `👑 #${rank.toLocaleString()}`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <h3 className="text-xl font-semibold mb-1">🛡 Trust Anchor</h3>
      <p className="text-sm text-white/70 mb-3">On-chain trust snapshot</p>
      
      {error && (
        <div className="mb-3 p-2 text-sm bg-red-500/20 text-red-200 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2 text-sm">
        <div className="h-px bg-white/10 my-2"></div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🗓️ Streak</span>
          <span>{isLoading ? '...' : (streak !== null ? `${streak} days` : '—')}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">📦 Claimed today</span>
          <span>{isLoading ? '...' : `${claimedToday} FRH`}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">💵 Holding</span>
          <span>{isLoading ? '...' : formatFRH(holding)} FRH</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">Rank</span>
          <span className="text-amber-300">
            {getRankDisplay()}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">💹 Referrals</span>
          <span>{formatNumber(referrals)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">♻️ Recasts</span>
          <span>{formatNumber(recasts)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🔘 Status</span>
          <span className={status === 'Active' ? 'text-emerald-400' : 'text-amber-400'}>
            {isLoading ? '...' : status}
          </span>
        </div>
      </div>
      
      <div className="h-px bg-white/10 my-2"></div>
      
      <div className="text-xs text-center text-white/50">
        ⚡ Powered by Base × Farcaster
      </div>
    </div>
  );
}
