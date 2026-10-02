import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import FarcasterMiniAppReady from "./components/FarcasterMiniAppReady";
import FarcasterWalletProvider from "./providers/FarcasterWalletProvider";
import AutoBindReferral from "./components/AutoBindReferral";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastProvider from "./providers/ToastProvider";

export const metadata: Metadata = {
  other: {
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col relative items-center overflow-x-hidden text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <ErrorBoundary>
          {/* Animated background elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>

          <FarcasterMiniAppReady />
          <FarcasterWalletProvider>
            <ToastProvider>
              <AutoBindReferral />

              <div className="w-full max-w-md min-h-screen flex flex-col relative z-10">
                <main
                  className="flex-1 px-4"
                  style={{
                    paddingTop: "env(safe-area-inset-top, 0px)",
                    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)",
                  }}
                >
                  {children}
                </main>
                
                {/* Fixed Footer */}
                <Footer />
              </div>

              <BottomNav />
            </ToastProvider>
          </FarcasterWalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}