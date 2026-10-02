"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaBoxOpen,
  FaCoins,
  FaTasks,
  FaUser,
} from "react-icons/fa";

const items = [
  { href: "/", label: "Home", icon: FaHome, color: "from-blue-500 to-cyan-500" },
  { href: "/chest", label: "Chest", icon: FaBoxOpen, color: "from-amber-500 to-orange-500" },
  { href: "/stake", label: "Stake", icon: FaCoins, color: "from-green-500 to-emerald-500" },
  { href: "/steam", label: "Steam", icon: FaTasks, color: "from-purple-500 to-pink-500" },
  { href: "/profile", label: "Profile", icon: FaUser, color: "from-indigo-500 to-purple-500" },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="
      fixed bottom-0 left-1/2 -translate-x-1/2
      w-[95%] max-w-md
      bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90
      backdrop-blur-2xl 
      border border-white/20
      shadow-2xl shadow-purple-500/20
      rounded-t-2xl
      px-1 py-2
      z-50
    "
    >
      <ul className="flex justify-between items-center">
        {items.map((item) => {
          const active = path === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 
                  text-xs font-medium
                  transition-all duration-300 ease-out
                  py-1.5 px-1 rounded-xl
                  ${active 
                    ? `bg-gradient-to-br ${item.color} text-white scale-105 shadow-lg` 
                    : "text-gray-400 hover:text-white hover:scale-105"
                  }
                `}
              >
                <div className={`
                  p-1.5 rounded-lg transition-all duration-300
                  ${active 
                    ? "bg-white/20 backdrop-blur-sm" 
                    : "hover:bg-white/10"
                  }
                `}>
                  <Icon size={16} />
                </div>
                <span className="text-[9px] font-semibold tracking-wide">
                  {item.label}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
