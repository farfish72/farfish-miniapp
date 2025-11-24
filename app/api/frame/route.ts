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
export async function POST(req: Request) {
  let wallet: string | null = null;
  let fid: number | null = null;
  let refParam: string | null = null;
  
  try {
    const body = await req.json();
    wallet = body?.wallet_address ?? body?.untrustedData?.address ?? null;
    const maybeFid = body?.untrustedData?.fid ?? body?.fid;
    fid = typeof maybeFid === 'number' ? maybeFid : Number(maybeFid);
    if (!Number.isFinite(fid)) fid = null;
  } catch {}

  // Extract ref parameter from request URL
  try {
    const { searchParams } = new URL(req.url);
    refParam = searchParams.get('ref');
  } catch {}

  try {
    if (!wallet && fid !== null) {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('fid', fid)
        .limit(1)
        .maybeSingle();
      wallet = (data as any)?.wallet_address ?? null;
    }
  } catch {}

  let tierId = 0;
  try {
    if (wallet) {
      const { data } = await supabase
        .from('staking_positions')
        .select('token_tier')
        .eq('wallet_address', wallet)
        .order('token_tier', { ascending: false })
        .limit(1)
        .maybeSingle();
      tierId = Number((data as any)?.token_tier ?? 0);
    }
  } catch {}

  const multiplier = multiplierById(tierId);
  const refQuery = refParam ? `?ref=${encodeURIComponent(refParam)}` : '';
  const gameTarget = `${appUrl}/game?multiplier=${multiplier.toFixed(1)}${refQuery}`;
  const mainTarget = `${appUrl}${refQuery}`;
  const stakeTarget = `${appUrl}/stake${refQuery}`;

  // Return HTML frame response with referral parameter preserved
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FarFISH Frame</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${appUrl}/frame-image.png" />
        <meta property="fc:frame:button:1" content="🎣 Play FarFISH" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:button:1:target" content="${mainTarget}" />
        <meta property="fc:frame:button:2" content="Stake NFTs" />
        <meta property="fc:frame:button:2:action" content="post_redirect" />
        <meta property="fc:frame:button:2:target" content="${stakeTarget}" />
        <meta property="fc:frame:post_url" content="${appUrl}/api/frame${refQuery ? `?ref=${encodeURIComponent(refParam!)}` : ''}" />
        
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
