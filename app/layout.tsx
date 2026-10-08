import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import FarcasterMiniAppReady from "./components/FarcasterMiniAppReady";
import FarcasterWalletProvider from "./providers/FarcasterWalletProvider";
import AutoBindReferral from "./components/AutoBindReferral";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastProvider from "./providers/ToastProvider";
import AppStateProvider from "./providers/AppStateProvider";

export const metadata: Metadata = {
  icons: {
    icon: "/icon.png",
  },
  other: {
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col relative items-center overflow-x-hidden text-white">
        <ErrorBoundary>
          <FarcasterMiniAppReady />
          <FarcasterWalletProvider>
            <AppStateProvider>
              <ToastProvider>
                <AutoBindReferral />

                <div className="w-full max-w-md min-h-screen flex flex-col relative z-10">
                  <main
                    className="flex-1 flex flex-col"
                    style={{
                      paddingTop: "env(safe-area-inset-top, 0px)",
                    }}
                  >
                    <div
                      style={{
                        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
                      }}
                    >
                      {children}
                    </div>
                    <div
                      style={{
                        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
                      }}
                    >
                      <Footer />
                    </div>
                  </main>
                </div>

                <BottomNav />
              </ToastProvider>
            </AppStateProvider>
          </FarcasterWalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}