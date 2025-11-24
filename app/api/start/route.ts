import { NextResponse } from 'next/server';

const appUrl = "https://farfish-miniapp5.vercel.app";

// Handler for both GET and POST requests
async function handler() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Launch FarFISH</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${appUrl}/splash.png" />
        <meta property="fc:frame:button:1" content="Play FarFISH 🎣" />
        <meta property="fc:frame:button:1:action" content="launch" />
        <meta property="fc:frame:button:1:target" content="${appUrl}/game" />
        
        <meta property="og:title" content="FarFISH Game" />
        <meta property="og:description" content="Start playing FarFISH now!" />
        <meta property="og:image" content="${appUrl}/splash.png" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export { handler as GET, handler as POST };
