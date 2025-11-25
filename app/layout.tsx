// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import ThirdwebProvider from "./providers/ThirdwebProvider";
import FarcasterMiniAppReady from "./components/FarcasterMiniAppReady";

const baseUrl = new URL("https://farfish-miniapp5.vercel.app");

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
        url: "https://farfish-miniapp5.vercel.app/frame-image.png",
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
    images: ["https://farfish-miniapp5.vercel.app/frame-image.png"],
  },
  // REMOVE the "other" metadata section completely ❌
  // Frame metadata should ONLY be in /api/frame endpoint
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