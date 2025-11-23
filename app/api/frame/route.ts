import { NextRequest, NextResponse } from "next/server";

const BASE = "https://farfish-miniapp5.vercel.app";

export async function GET() {
  return NextResponse.json({
    version: "1",
    name: "FarFISH",
    iconUrl: `${BASE}/icon.png`,
    homeUrl: `${BASE}`,
    imageUrl: `${BASE}/image.png`,
    buttonTitle: "Open",
    webhookUrl: `${BASE}/api/frame`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idx = Number(body?.button) ?? 0;

    const actions = [
      { title: "Mint NFT", target: `${BASE}/` },
      { title: "Leaderboard", target: `${BASE}/leaderboard` },
      { title: "Profile", target: `${BASE}/profile` },
    ];

    const next = actions[Math.max(0, Math.min(actions.length - 1, idx))];

    return NextResponse.json({
      version: "1",
      name: "FarFISH",
      iconUrl: `${BASE}/icon.png`,
      imageUrl: `${BASE}/image.png`,
      buttons: actions.map((a) => a.title),
      postUrl: `${BASE}/api/frame`,
      intents: {
        action: "post_redirect",
        target: next.target,
      },
    });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
