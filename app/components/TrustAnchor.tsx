// app/components/TrustAnchor.tsx
'use client';

interface TrustAnchorProps {
  streak: number | null;          // Current consecutive streak
  daysActive: number | null;      // Total cumulative days (never resets)
  referrals: number | null;       // Lifetime referral count
  totalHolding: string | null;    // Total FRH token balance (formatted)
  rank: number | null;            // User's rank based on referrals
  hasActiveStake: boolean;        // Whether user has active NFT stake
  isLoading?: boolean;            // Loading state
  error?: string | null;          // Error message if any
}

export default function TrustAnchor({
  streak,
  daysActive,
  referrals,
  totalHolding,
  rank,
  hasActiveStake,
  isLoading = false,
  error = null,
}: TrustAnchorProps) {
  // Format number safely
  const formatNumber = (num: number | null): string => {
    return num !== null && num >= 0 ? num.toString() : '0';
  };

  // Determine tier based ONLY on active stake status
  const tier = hasActiveStake ? 'Premium' : 'Basic';

  const fields = [
    { 
      icon: "✅", 
      label: "Status", 
      value: "Active",
      color: "from-green-400 to-emerald-500",
      bgColor: "from-green-500/20 to-emerald-500/20"
    },
    { 
      icon: "📅", 
      label: "Days Active", 
      value: formatNumber(daysActive),
      color: "from-blue-400 to-cyan-500",
      bgColor: "from-blue-500/20 to-cyan-500/20"
    },
    { 
      icon: "🔥", 
      label: "Current Streak", 
      value: `${formatNumber(streak)} days`,
      color: "from-orange-400 to-red-500",
      bgColor: "from-orange-500/20 to-red-500/20"
    },
    { 
      icon: "🤝", 
      label: "Referrals", 
      value: formatNumber(referrals),
      color: "from-purple-400 to-pink-500",
      bgColor: "from-purple-500/20 to-pink-500/20"
    },
    { 
      icon: "�", 
      label: "Total Holding", 
      value: totalHolding || "0 FRH",
      color: "from-yellow-400 to-amber-500",
      bgColor: "from-yellow-500/20 to-amber-500/20"
    },
    { 
      icon: "📊", 
      label: "Rank", 
      value: rank ? `#${rank}` : "Unranked",
      color: "from-indigo-400 to-purple-500",
      bgColor: "from-indigo-500/20 to-purple-500/20"
    },
    { 
      icon: "⏱️", 
      label: "Next Snapshot", 
      value: "~30 days",
      color: "from-teal-400 to-cyan-500",
      bgColor: "from-teal-500/20 to-cyan-500/20"
    },
    { 
      icon: tier === 'Premium' ? "👑" : "🥉", 
      label: "Tier", 
      value: tier,
      color: tier === 'Premium' ? "from-cyan-400 to-blue-500" : "from-gray-400 to-slate-500",
      bgColor: tier === 'Premium' ? "from-cyan-500/20 to-blue-500/20" : "from-gray-500/20 to-slate-500/20"
    }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-2xl shadow-slate-500/20">
      {/* Animated background elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-2xl">📈</span>
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Trust Anchor
            </h3>
            <p className="text-sm text-white/70">Your progress tracker</p>
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {fields.map((field, idx) => (
            <div 
              key={idx}
              className={`
                relative overflow-hidden bg-gradient-to-br ${field.bgColor} backdrop-blur-sm 
                border border-white/10 rounded-2xl p-3 hover:scale-105 transition-all duration-300
                ${fields.length % 2 !== 0 && idx === fields.length - 1 ? 'col-span-2' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-lg bg-gradient-to-br ${field.color} 
                  flex items-center justify-center shadow-lg flex-shrink-0
                `}>
                  <span className="text-sm">{field.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/60 font-medium">{field.label}</p>
                  <p className={`text-sm font-bold bg-gradient-to-r ${field.color} bg-clip-text text-transparent truncate`}>
                    {isLoading ? '...' : field.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-white/10">
          <p className="text-sm text-white/80 text-center">
            Your activity is tracked daily and contributes to future snapshots and rewards.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
