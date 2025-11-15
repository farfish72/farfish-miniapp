import './globals.css'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import React from 'react'

export const metadata = {
  title: 'FarFISH Deck',
  description: 'Premium Fishing App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-[#021524] to-[#003a5d] text-white min-h-screen antialiased">
        <Header />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

