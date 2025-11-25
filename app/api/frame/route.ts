import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { multiplierById } from '../../constants';

const appUrl = "https://farfish-miniapp5.vercel.app";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const refParam = searchParams.get('ref') || '';
    const refQuery = refParam ? `?ref=${encodeURIComponent(refParam)}` : '';
    const targetUrl = `${appUrl}${refQuery}`;
    const postUrlWithRef = refParam ? `${appUrl}/api/frame?ref=${encodeURIComponent(refParam)}` : `${appUrl}/api/frame`;
    
    const html = `<!DOCTYPE html>
<html>
<head>
<meta property="fc:frame" content="vNext">
<meta property="fc:frame:image" content="${appUrl}/frame-image.png">
<meta property="fc:frame:post_url" content="${postUrlWithRef}">
<meta property="fc:frame:button:1" content="Chest">
<meta property="fc:frame:button:1:action" content="launch">
<meta property="fc:frame:button:1:target" content="${appUrl}/chest${refQuery}">
<meta property="fc:frame:button:2" content="Stake">
<meta property="fc:frame:button:2:action" content="launch">
<meta property="fc:frame:button:2:target" content="${appUrl}/stake${refQuery}">
<meta property="fc:frame:button:3" content="Rank">
<meta property="fc:frame:button:3:action" content="launch">
<meta property="fc:frame:button:3:target" content="${appUrl}/rank${refQuery}">
<meta property="fc:frame:button:4" content="Profile">
<meta property="fc:frame:button:4:action" content="launch">
<meta property="fc:frame:button:4:target" content="${appUrl}/profile${refQuery}">
<meta property="og:title" content="FarFISH">
<meta property="og:description" content="Chest, Stake, Rank, Profile">
<meta property="og:image" content="${appUrl}/frame-image.png">
</head>
<body>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
    });
  } catch (error) {
    console.error('Frame GET error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { untrustedData } = body;
    const address = untrustedData?.address;
    const fid = untrustedData?.fid;
    
    // Calculate multiplier based on address or use default
    const multiplier = address ? await calculateMultiplier(address) : 1.5;
    
    const { searchParams } = new URL(req.url);
    const refParam = searchParams.get('ref') || '';
    const refQuery = refParam ? `?ref=${encodeURIComponent(refParam)}` : '';
    const targetUrl = `${appUrl}${refQuery}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta property="fc:frame" content="vNext">
<meta property="fc:frame:image" content="${appUrl}/frame-image.png">
<meta property="fc:frame:post_url" content="${appUrl}/api/frame">
<meta property="fc:frame:button:1" content="Chest">
<meta property="fc:frame:button:1:action" content="launch">
<meta property="fc:frame:button:1:target" content="${appUrl}/chest${refQuery}">
<meta property="fc:frame:button:2" content="Stake">
<meta property="fc:frame:button:2:action" content="launch">
<meta property="fc:frame:button:2:target" content="${appUrl}/stake${refQuery}">
<meta property="fc:frame:button:3" content="Rank">
<meta property="fc:frame:button:3:action" content="launch">
<meta property="fc:frame:button:3:target" content="${appUrl}/rank${refQuery}">
<meta property="fc:frame:button:4" content="Profile">
<meta property="fc:frame:button:4:action" content="launch">
<meta property="fc:frame:button:4:target" content="${appUrl}/profile${refQuery}">
<meta property="og:title" content="FarFISH">
<meta property="og:description" content="Chest, Stake, Rank, Profile">
<meta property="og:image" content="${appUrl}/frame-image.png">
</head>
<body>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
    });
  } catch (error) {
    console.error('Frame POST error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

// Multiplier calculation function
async function calculateMultiplier(address: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('multiplier')
      .eq('wallet_address', address)
      .single();
    
    if (error || !data) {
      return 1.5;
    }
    
    return data.multiplier || 1.5;
  } catch (error) {
    console.error('Multiplier calculation error:', error);
    return 1.5;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}