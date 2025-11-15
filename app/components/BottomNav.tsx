"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Chest", path: "/chest" },
    { name: "NFT Stake", path: "/stake" },
    { name: "Leaderboard", path: "/leaderboard" },
    { name: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-black/40 backdrop-blur-lg border-t border-white/10 py-3">
      <div className="flex items-center justify-around text-white">
        {navItems.map((item) => {
          const active = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm ${
                active ? "text-blue-400 font-semibold" : "text-white/60"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
