import type { Metadata } from "next";
import { Suspense } from "react";
import HomeClient from "./HomeClient";

// ✔ This metadata must stay here (top of file)
export const metadata: Metadata = {
  title: "FarFISH – Mint & Rewards",
  description: "Mint. Stake. Earn. Dominate the Seas.",

  openGraph: {
    title: "FarFISH",
    description: "Mint. Stake. Earn. Dominate the Seas.",
    type: "website",
    url: "https://farfish-miniapp5.vercel.app",
    images: ["https://farfish-miniapp5.vercel.app/og-image.png"],
  },

  twitter: {
    card: "summary_large_image",
    title: "FarFISH",
    description: "Mint. Stake. Earn. Dominate the Seas.",
    images: ["https://farfish-miniapp5.vercel.app/og-image.png"],
  },

  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://farfish-miniapp5.vercel.app/og-image.png",
      button: {
        title: "Open FarFISH",
        action: {
          type: "launch_miniapp",
          url: "https://farfish-miniapp5.vercel.app",
          name: "FarFISH",
          splashImageUrl: "https://farfish-miniapp5.vercel.app/splash.png",
          splashBackgroundColor: "#000000"
        }
      }
    }),

    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://farfish-miniapp5.vercel.app/og-image.png",
      button: {
        title: "Open FarFISH",
        action: {
          type: "launch_frame",
          url: "https://farfish-miniapp5.vercel.app",
          name: "FarFISH",
          splashImageUrl: "https://farfish-miniapp5.vercel.app/splash.png",
          splashBackgroundColor: "#000000"
        }
      }
    })
  }
};

export default function Home() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <HomeClient />
    </Suspense>
  );
}
