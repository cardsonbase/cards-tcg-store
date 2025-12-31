import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME?.trim();
const PRIVATE_KEY_ESCAPED = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();

 // Convert \n to actual newlines – critical for PEM parsing
const PRIVATE_KEY = PRIVATE_KEY_ESCAPED?.replace(/\\n/g, '\n');

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      console.error('Missing or invalid env vars – check Vercel');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    console.log('Generating session token for:', address);

    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      uri: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
      header: { kid: API_KEY_NAME },  // Full name works per Coinbase examples
    });

    console.log('JWT signed successfully');

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

    console.log('Coinbase status:', res.status);

    if (!res.ok) {
      console.error('Coinbase rejected JWT:', data);
      return NextResponse.json({ error: 'Token failed', details: data }, { status: 500 });
    }

    console.log('Success! Session token ready');
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('JWT/parse error:', error.message);
    return NextResponse.json({ error: 'Failed', msg: error.message }, { status: 500 });
  }
}
