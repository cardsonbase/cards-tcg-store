import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME;
const PRIVATE_KEY = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY;  // Multiline PEM – no .replace() needed

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      console.error('Missing CDP API key config – check Vercel env vars');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    console.log('Generating session token for address:', address);

    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,  // 1 minute validity
      uri: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
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
      console.error('Coinbase API error:', res.status, data);
      return NextResponse.json({ error: 'Failed to generate token', details: data }, { status: 500 });
    }

    console.log('Session token generated successfully');
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('Unexpected error in session route:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
