import type { Metadata } from "next";

const SITE_URL = "https://farfish-miniapp5.vercel.app";

export const metadata: Metadata = {
  title: "FarFISH Frame",
  description: "Catch and stake fish with FarFISH.",
  openGraph: {
    title: "FarFISH Chest",
    description: "Open your FarFISH chest or go to the app.",
    images: [`${SITE_URL}/frame-image.png`],
    url: `${SITE_URL}/frame`,
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${SITE_URL}/frame-image.png`,

    "fc:frame:button:1": "Open FarFISH",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": SITE_URL,

    "fc:frame:button:2": "Open Chest",
    "fc:frame:button:2:action": "link",
    "fc:frame:button:2:target": `${SITE_URL}/chest`,
  },
};

export default function FramePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0.75rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>FarFISH Frame</h1>
      <p style={{ opacity: 0.7, maxWidth: 480, textAlign: "center" }}>
        This page is used as a Farcaster Frame. Share <code>{SITE_URL}/frame</code> in your cast.
      </p>
    </main>
  );
}
