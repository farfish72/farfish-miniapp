// app/profile/page.tsx
"use client";

export default function ProfilePage() {
  return (
    <main className="min-h-screen w-full flex justify-center bg-[#04121a] text-white p-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">FarFISH</h1>
            <p className="text-sm text-white/70">Profile</p>
          </div>
        </header>

        {/* PROFILE CARD */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center font-bold">ME</div>
            <div>
              <div className="font-semibold">Your Name</div>
              <div className="text-xs text-white/60">0x0000...0000 (demo)</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/6 rounded-lg p-3 text-center">
              <div className="text-xs text-white/60">NFTs</div>
              <div className="font-bold mt-1">0</div>
            </div>
            <div className="bg-white/6 rounded-lg p-3 text-center">
              <div className="text-xs text-white/60">Staked</div>
              <div className="font-bold mt-1">0</div>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-[#00d4c4] to-[#3be6c1] text-black font-bold py-3 rounded-lg">Edit Profile (demo)</button>
        </section>

        {/* ACTIVITY */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <div className="text-sm text-white/70">No recent activity (demo).</div>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-white/50 mt-4">
          FarFISH © All rights reserved
        </footer>
      </div>
    </main>
  );
}