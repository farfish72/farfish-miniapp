// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { Suspense } from "react";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import ThirdwebProvider from "./providers/ThirdwebProvider";
import FarcasterMiniAppReady from "./components/FarcasterMiniAppReady";
import FarcasterWalletProvider from "./providers/FarcasterWalletProvider";
import { FarcasterSignerProvider } from "./contexts/FarcasterSignerContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col relative items-center overflow-x-hidden text-white">
        <FarcasterMiniAppReady />
        <FarcasterWalletProvider>
          <FarcasterSignerProvider>
            <ThirdwebProvider>
              <main
                className="w-full max-w-md min-h-screen flex flex-col px-4"
                style={{
                  paddingTop: "env(safe-area-inset-top, 0px)",
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
                }}
              >
                <div className="flex-1 w-full flex flex-col">
                  {children}
                </div>

                <Footer />
              </main>
            </ThirdwebProvider>
          </FarcasterSignerProvider>
        </FarcasterWalletProvider>

        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
