"use client";
import Header from "../components/Header";

export default function ProfilePage() {
  return (
    <main className="min-h-screen p-4">
      <Header />
      <h2 className="text-xl font-semibold mb-3">Profile</h2>

      <div className="bg-white/5 p-4 rounded-lg">
        <p className="text-sm text-white/70">Wallet: not connected (demo)</p>
        <div className="mt-3 text-xs text-white/60">My NFTs and settings will show here.</div>
      </div>
    </main>
  );
}
