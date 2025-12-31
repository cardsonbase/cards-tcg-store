import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME?.trim();
const PRIVATE_KEY_ESCAPED = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();
const PRIVATE_KEY = PRIVATE_KEY_ESCAPED?.replace(/\\n/g, '\n').trim();

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'No address' }, { status: 400 });
    }

    // Fixed: Use 'aud' for Onramp token endpoint
    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      aud: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',  // Correct for your ECDSA key
      header: { kid: API_KEY_NAME },
    });

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

    if (!res.ok) {
      console.error('Coinbase error:', res.status, data);
      return NextResponse.json({ error: 'Token failed', details: data }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({ error: 'Failed', msg: error.message }, { status: 500 });
  }
}
