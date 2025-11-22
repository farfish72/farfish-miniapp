type Entry = { rank:number; address:string; stakedCount?:number; score?:number; badge?:string };

export default function Leaderboard({ entries = [] as Entry[] }:{entries?:Entry[]}) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <h4 className="text-sm font-semibold mb-2">Leaderboard</h4>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-xs text-white/60">No entries yet.</div>
        ) : entries.map(e => (
          <div key={e.address} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 text-center font-semibold">#{e.rank}</div>
              <div className="text-xs text-white/80">{e.address}</div>
            </div>
            <div className="text-xs text-white/70">{e.stakedCount ?? 0} staked</div>
          </div>
        ))}
      </div>
    </div>
  );
}
