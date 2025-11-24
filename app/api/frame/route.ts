import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { multiplierById } from '../../constants';

const appUrl = "https://farfish-miniapp5.vercel.app";

// Handles GET request (for initial frame display)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const refParam = searchParams.get('ref') || '';
  const refQuery = refParam ? `?ref=${encodeURIComponent(refParam)}` : '';
  const targetUrl = `${appUrl}${refQuery}`;
  const postUrlWithRef = refParam ? `${appUrl}/api/frame?ref=${encodeURIComponent(refParam)}` : `${appUrl}/api/frame`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FarFISH Frame</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${appUrl}/frame-image.png" />
        <meta property="fc:frame:button:1" content="🎣 Play FarFISH" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:button:1:target" content="${targetUrl}" />
        <meta property="fc:frame:button:2" content="Stake NFTs" />
        <meta property="fc:frame:button:2:action" content="post_redirect" />
        <meta property="fc:frame:button:2:target" content="${appUrl}/stake${refQuery}" />
        <meta property="fc:frame:post_url" content="${postUrlWithRef}" />
        
        <meta property="og:title" content="FarFISH" />
        <meta property="og:description" content="Mint. Stake. Earn. Dominate the seas." />
        <meta property="og:image" content="${appUrl}/frame-image.png" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handles POST request (for button click callback)
export async function POST() {
  const appUrl = "https://farfish-miniapp5.vercel.app";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${appUrl}/frame-image.png" />
        <meta property="fc:frame:post_url" content="${appUrl}/api/frame" />
        <meta property="fc:frame:button:1" content="Open FarFISH" />
        <meta property="fc:frame:button:1:action" content="launch" />
        <meta property="fc:frame:button:1:target" content="${appUrl}" />
        <meta property="og:title" content="FarFISH" />
        <meta property="og:description" content="5X stake multipliers and daily rewards" />
        <meta property="og:image" content="${appUrl}/frame-image.png" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
