import "./globals.css";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#04121a] text-white min-h-screen">
        <Header />
        <main className="max-w-6xl mx-auto px-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}