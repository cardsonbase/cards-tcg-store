// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

const ALLOWED_ORIGINS = [
  'https://cards-tcg-store.vercel.app', // Vercel deployment
];

export async function POST(request: NextRequest) {
  // === CORS Preflight Handling ===
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    // CORS headers on all responses below
  } else {
    // Reject requests from unknown origins
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Missing API key config' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': origin || '' } }
      );
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': origin || '' } }
      );
    }

    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
      }),
    });

    const data = await res.json();

    console.log('Coinbase status:', res.status, 'Response:', data);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Coinbase failed', details: data },
        { status: 500, headers: { 'Access-Control-Allow-Origin': origin || '' } }
      );
    }

    // Success — return session token
    const response = NextResponse.json({ sessionToken: data.token });

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin || '');
    response.headers.set('Access-Control-Allow-Methods', 'POST');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (err: any) {
    console.error('Error:', err);
    const response = NextResponse.json(
      { error: 'Server error', msg: err.message },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', origin || '');
    return response;
  }
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  return new NextResponse(null, { status: 403 });
}
