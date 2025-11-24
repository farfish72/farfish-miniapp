import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "FarFISH",
    iconUrl: "https://farfish-miniapp5.vercel.app/icon.png",
    homeUrl: "https://farfish-miniapp5.vercel.app",
    imageUrl: "https://farfish-miniapp5.vercel.app/frame-image.png",
    buttonTitle: "Open FarFISH",
    splashImageUrl: "https://farfish-miniapp5.vercel.app/splash.png",
    webhookUrl: "https://farfish-miniapp5.vercel.app/api/frame"
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

