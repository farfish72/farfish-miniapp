// app/components/TrustAnchor.tsx
'use client';

import { useEffect, useState } from 'react';
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

  // Fetch rank when address or holding changes
  useEffect(() => {
    if (!address) {
      setRank(null);
      return;
    }

    const fetchRank = async () => {
      setIsLoadingRank(true);
      setRankError(null);
      
      try {
        const response = await fetch(`/api/rank?address=${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rank');
        }
        const data = await response.json();
        setRank(data.rank);
      } catch (err) {
        console.error('Error fetching rank:', err);
        setRankError('Failed to load rank');
      } finally {
        setIsLoadingRank(false);
      }
    };

    // Add a small delay to prevent rapid requests
    const timer = setTimeout(fetchRank, 500);
    return () => clearTimeout(timer);
  }, [address, holding]);

  const getRankDisplay = () => {
    if (isLoading) return '...';
    if (rankError) return 'Error';
    if (rank === null || rank === 0) return 'Unranked';
    return `#${rank.toLocaleString()}`;
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
          <span className="text-white/70">👑 Rank</span>
          <span className={rankError ? 'text-amber-400' : ''}>
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
