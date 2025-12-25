// app/components/TrustAnchor.tsx
'use client';

interface TrustAnchorProps {
  streak: number | null;
  claimedToday: number;
  totalRewards: number | null;
  referrals: number | null;
  followingFarfish: boolean | null;
  recasts: number | null;
}

export default function TrustAnchor({
  streak,
  claimedToday,
  totalRewards,
  referrals,
  followingFarfish,
  recasts,
}: TrustAnchorProps) {
  // Format number with commas
  const formatNumber = (num: number | null): string => {
    return num !== null ? num.toLocaleString() : '—';
  };

  // Format boolean to Yes/No
  const formatBoolean = (value: boolean | null): string => {
    return value === true ? 'Yes' : value === false ? 'No' : '—';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <h3 className="text-xl font-semibold mb-3">🛡 Trust Anchor</h3>
      <p className="text-sm text-white/70 mb-4">Your verified activity snapshot</p>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-white/70">✨ Streak</span>
          <span>{streak !== null ? `${streak} days` : '—'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">💎 Claimed today</span>
          <span>{claimedToday > 0 ? `${claimedToday} FRH` : '0 FRH'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🏆 Total rewards</span>
          <span>{totalRewards !== null ? `${totalRewards} FRH` : '—'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">👥 Referrals</span>
          <span>{formatNumber(referrals)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🔗 Following FarFISH</span>
          <span>{formatBoolean(followingFarfish)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🔁 Recasts</span>
          <span>{formatNumber(recasts)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-white/70">🟢 Status</span>
          <span className={claimedToday > 0 ? 'text-emerald-400' : 'text-amber-400'}>
            {claimedToday > 0 ? 'Active today' : 'Not active'}
          </span>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-white/10 text-xs text-center text-white/50">
        Powered by Base × Farcaster
      </div>
    </div>
  );
}
