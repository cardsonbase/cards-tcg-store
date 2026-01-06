// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers'; // npm install ethers

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();
const ALLOWED_ORIGIN = 'https://cards-tcg-store.vercel.app'; // exact production domain

export async function POST(request: NextRequest) {
  try {
    // 1. Validate CDP keys
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // 2. Get and validate client-provided address (from connected wallet)
    const body = await request.json();
    const address = body.address?.trim();

    if (!address || !ethers.isAddress(address)) { // Proper checksum validation
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // 3. Get true client IP (required by Coinbase for fraud detection)
    const clientIp = request.ip;
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine IP' }, { status: 400 });
    }

    // 4. Generate JWT and request session token from Coinbase
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    const coinbaseRes = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
        clientIp, // Critical for compliance
      }),
    });

    const data = await coinbaseRes.json();

    if (!coinbaseRes.ok) {
      console.error('Coinbase error:', data);
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    // 5. Return session token with restricted CORS
    return NextResponse.json({ sessionToken: data.token }, {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (err: any) {
    console.error('Onramp error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Handle preflight (required for restricted origin)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
