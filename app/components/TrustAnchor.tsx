// app/components/TrustAnchor.tsx
'use client';

interface TrustAnchorProps {
  streak: number | null;          // From localStorage (ff_streak)
  claimedToday: number;           // From on-chain (Claim Controller)
  holding: number | null;         // From ERC20 balanceOf
  rank: number | null;            // From Upstash KV (via Server API)
  referrals: number | null;       // From Upstash KV
  recasts: number | null;         // From Upstash KV
  isLoading?: boolean;            // Loading state
  error?: string | null;          // Error message if any
}

export default function TrustAnchor({
  streak,
  claimedToday,
  holding,
  rank,
  referrals,
  recasts,
  isLoading = false,
  error = null,
}: TrustAnchorProps) {
  // Format number with commas
  const formatNumber = (num: number | null): string => {
    return num !== null ? num.toString() : '—';
  };

  // Status is derived from claimedToday
  const status = claimedToday > 0 ? 'Active' : 'Inactive';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <h3 className="text-xl font-semibold mb-1">🛡 Trust Anchor</h3>
      <p className="text-sm text-white/70 mb-3">On-chain trust snapshot</p>
      
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
          <span>{isLoading ? '...' : (holding !== null ? `${holding} FRH` : '—')}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">👑 Rank</span>
          <span>{isLoading ? '...' : (rank !== null ? `#${rank}` : 'Unranked')}</span>
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
