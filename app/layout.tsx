// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import ThirdwebProvider from "./providers/ThirdwebProvider";
import FarcasterMiniAppReady from "./components/FarcasterMiniAppReady";

const baseUrl = new URL("https://farfish.app");

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: "FarFISH",
  description: "Mint. Stake. Earn. Dominate the seas.",
  openGraph: {
    title: "FarFISH",
    description: "Mint. Stake. Earn. Dominate the seas.",
    url: baseUrl,
    siteName: "FarFISH",
    images: [
      {
        url: "https://farfish.app/frame-placeholder.png",
        width: 1200,
        height: 630,
        alt: "FarFISH preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FarFISH",
    description: "Mint. Stake. Earn. Dominate the seas.",
    images: ["https://farfish.app/frame-placeholder.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://farfish.app/frame-placeholder.png",
    "fc:frame:post_url": "https://farfish.app/api/frame",
    "fc:frame:button:1": "Mint",
    "fc:frame:button:1:action": "post",
    "fc:frame:button:2": "Stake",
    "fc:frame:button:2:action": "post_redirect",
    "fc:frame:button:2:target": "https://farfish.app/stake",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col relative items-center overflow-x-hidden text-white">
        <FarcasterMiniAppReady />
        <ThirdwebProvider>
          {/* MAIN MOBILE WRAPPER - Flex container */}
          <main
            className="w-full max-w-md min-h-screen flex flex-col px-4"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
            }}
          >
            {/* Dynamic page content - Flex-1 to fill available space */}
            <div className="flex-1 w-full flex flex-col">
              {children}
            </div>
            <Footer />
          </main>
        </ThirdwebProvider>

        {/* FIXED BOTTOM NAV */}
        <BottomNav />
      </body>
    </html>
  );
}
