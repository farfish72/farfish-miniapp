// app/components/SplashScreen.tsx
"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("ff_splash_seen");
      if (seen) {
        setVisible(false);
        return;
      }
    } catch {}

    const t = setTimeout(() => {
      try { localStorage.setItem("ff_splash_seen", "1"); } catch {}
      setVisible(false);
    }, 2500);

    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, rgba(2,6,23,1), rgba(6,12,24,1))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div>
        <Image
          src="/welcome.png"
          alt="FarFISH"
          width={220}
          height={220}
          style={{
            objectFit: "contain",
            borderRadius: 16,
            margin: "0 auto",
          }}
          priority
        />
        <h2 className="mt-4 text-xl font-bold">
          Welcome to the secure future.
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Mint. Stake. Earn. Dominate the seas.
        </p>
      </div>
    </div>
  );
}
