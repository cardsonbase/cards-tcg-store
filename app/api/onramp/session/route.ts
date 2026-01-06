// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

const ALLOWED_ORIGINS = ['https://cards-tcg-store.vercel.app'];

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Reject unknown origins early
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      const res = NextResponse.json({ error: 'Missing API key config' }, { status: 500 });
      if (origin) res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
      return res;
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      const res = NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      if (origin) res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
      return res;
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
      const errorRes = NextResponse.json({ error: 'Coinbase failed', details: data }, { status: 500 });
      if (origin) errorRes.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
      return errorRes;
    }

    // Success
    const response = NextResponse.json({ sessionToken: data.token });
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    response.headers.set('Access-Control-Allow-Methods', 'POST');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (err: any) {
    console.error('Error:', err);
    const errorRes = NextResponse.json({ error: 'Server error', msg: err.message }, { status: 500 });
    if (origin) errorRes.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    return errorRes;
  }
}

// Preflight handler
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Bad origin — no ACAO header
  return new NextResponse('CORS origin not allowed', { status: 403 });
}
