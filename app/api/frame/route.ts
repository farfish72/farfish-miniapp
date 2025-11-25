import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { multiplierById } from '../../constants';

const appUrl = "https://farfish-miniapp5.vercel.app";

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${appUrl}/frame-image.png" />
  <meta property="fc:frame:post_url" content="${appUrl}/api/frame" />
  
  <meta property="fc:frame:button:1" content="Chest" />
  <meta property="fc:frame:button:1:action" content="launch" />
  <meta property="fc:frame:button:1:target" content="${appUrl}/chest" />
  
  <meta property="fc:frame:button:2" content="Stake" />
  <meta property="fc:frame:button:2:action" content="launch" />
  <meta property="fc:frame:button:2:target" content="${appUrl}/stake" />
  
  <meta property="fc:frame:button:3" content="Rank" />
  <meta property="fc:frame:button:3:action" content="launch" />
  <meta property="fc:frame:button:3:target" content="${appUrl}/rank" />
  
  <meta property="fc:frame:button:4" content="Profile" />
  <meta property="fc:frame:button:4:action" content="launch" />
  <meta property="fc:frame:button:4:target" content="${appUrl}/profile" />
  
  <meta property="og:title" content="FarFISH" />
  <meta property="og:description" content="Chest, Stake, Rank, Profile" />
  <meta property="og:image" content="${appUrl}/frame-image.png" />
</head>
<body>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${appUrl}/frame-image.png" />
  <meta property="fc:frame:post_url" content="${appUrl}/api/frame" />
  
  <meta property="fc:frame:button:1" content="Chest" />
  <meta property="fc:frame:button:1:action" content="launch" />
  <meta property="fc:frame:button:1:target" content="${appUrl}/chest" />
  
  <meta property="fc:frame:button:2" content="Stake" />
  <meta property="fc:frame:button:2:action" content="launch" />
  <meta property="fc:frame:button:2:target" content="${appUrl}/stake" />
  
  <meta property="fc:frame:button:3" content="Rank" />
  <meta property="fc:frame:button:3:action" content="launch" />
  <meta property="fc:frame:button:3:target" content="${appUrl}/rank" />
  
  <meta property="fc:frame:button:4" content="Profile" />
  <meta property="fc:frame:button:4:action" content="launch" />
  <meta property="fc:frame:button:4:target" content="${appUrl}/profile" />
</head>
<body>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}