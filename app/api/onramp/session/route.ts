// /api/onramp/session/route.ts (or .js)

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME?.trim();
const PRIVATE_KEY_ESCAPED = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();
const PRIVATE_KEY = PRIVATE_KEY_ESCAPED?.replace(/\\n/g, '\n').trim();

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      console.error('Missing API key name or private key');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,  // 60s is fine
      aud: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
      header: { kid: API_KEY_NAME },
    });

    console.log('Generated JWT (first 50 chars):', token.slice(0, 50) + '...'); // For debug

    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],  // These are fine for Base
      }),
    });

    const data = await res.json();

    console.log('Coinbase response status:', res.status);
    console.log('Coinbase response body:', data);  // Critical for debugging!

    if (!res.ok) {
      return NextResponse.json({ error: 'Coinbase token failed', details: data, status: res.status }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('JWT signing or fetch error:', error);
    return NextResponse.json({ error: 'Server error', msg: error.message }, { status: 500 });
  }
}
