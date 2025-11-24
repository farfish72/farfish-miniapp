"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaBoxOpen,
  FaCoins,
  FaTrophy,
  FaUser,
} from "react-icons/fa";

const items = [
  { href: "/", label: "Home", icon: FaHome },
  { href: "/chest", label: "Chest", icon: FaBoxOpen },
  { href: "/stake", label: "Stake", icon: FaCoins },
  { href: "/rank", label: "Rank", icon: FaTrophy },
  { href: "/profile", label: "Profile", icon: FaUser },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="
      fixed bottom-0 left-1/2 -translate-x-1/2
      w-[92%] max-w-md
      bg-white/10 backdrop-blur-xl 
      border border-white/20
      shadow-2xl
      rounded-3xl
      px-4 py-2
      z-50
    "
    >
      <ul className="flex justify-between items-center">
        {items.map((i) => {
          const active = path === i.href;
          const Icon = i.icon;

          return (
            <li key={i.href} className="flex-1">
              <Link
                href={i.href}
                className={`
                  flex flex-col items-center gap-1 
                  text-xs 
                  transition-all duration-200
                  ${active ? "text-blue-400 scale-110" : "text-gray-300"}
                `}
              >
                <Icon size={22} />
                {i.label}
                {active && (
                  <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
