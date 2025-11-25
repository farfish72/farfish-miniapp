import type { Metadata } from "next";

const SITE_URL = "https://farfish-miniapp5.vercel.app";

export const metadata: Metadata = {
  title: "FarFISH Frame",
  description: "Catch and stake fish with FarFISH.",
  openGraph: {
    title: "FarFISH",
    description: "Your daily chest, staking & rewards.",
    images: [`${SITE_URL}/frame-image.png`],
    url: `${SITE_URL}/frame`,
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${SITE_URL}/frame-image.png`,

    // ONE BUTTON ONLY
    "fc:frame:button:1": "Open FarFISH",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": SITE_URL,
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
        Share <code>{SITE_URL}/frame</code> in your cast.
      </p>
    </main>
  );
}
