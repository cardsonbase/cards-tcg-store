// /api/onramp/session/route.ts

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME?.trim();
// Ed25519 private key is a single base64 string — no escaping or newlines needed
const PRIVATE_KEY = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();

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
      exp: Math.floor(Date.now() / 1000) + 60,
      aud: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    // Critical changes for Ed25519
    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'EdDSA',                 // ← Ed25519 uses EdDSA
      header: { kid: API_KEY_NAME },
    });

    console.log('Generated JWT (first 50 chars):', token.slice(0, 50) + '...');

    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
      }),
    });

    const data = await res.json();

    console.log('Coinbase response status:', res.status);
    console.log('Coinbase response body:', data);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Coinbase token failed', details: data, status: res.status },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('JWT signing or fetch error:', error);
    return NextResponse.json({ error: 'Server error', msg: error.message }, { status: 500 });
  }
}
