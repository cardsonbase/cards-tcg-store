import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME?.trim();
const PRIVATE_KEY_WITH_ESCAPES = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();

if (!API_KEY_NAME || !PRIVATE_KEY_WITH_ESCAPES) {
  console.error('Missing env vars – check Vercel settings');
}

// Convert \n escapes to actual newlines for PEM
const PRIVATE_KEY = PRIVATE_KEY_WITH_ESCAPES?.replace(/\\n/g, '\n');

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured – missing keys' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    console.log('Generating token for address:', address);

    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      uri: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    // Use full name for kid (standard for Onramp from docs examples)
    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
      header: { kid: API_KEY_NAME },
    });

    console.log('JWT signed');

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

    if (!res.ok) {
      console.error('Coinbase error details:', data);
      return NextResponse.json({ error: 'Token generation failed', details: data }, { status: 500 });
    }

    console.log('Success – sessionToken generated');
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({ error: 'JWT or fetch failed', msg: error.message }, { status: 500 });
  }
}
