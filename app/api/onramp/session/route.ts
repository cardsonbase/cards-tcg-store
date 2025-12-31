// app/api/onramp/session/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME!;
const PRIVATE_KEY = process.env.CDP_SECRET_API_KEY!.replace(/\\n/g, '\n'); // Fix line breaks if needed

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // Generate JWT (valid for 1 minute)
    const jwtToken = jwt.sign(
      {
        iss: API_KEY_NAME,
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60,
        uri: 'https://api.developer.coinbase.com/onramp/v1/token',
      },
      PRIVATE_KEY,
      { algorithm: 'ES256', header: { kid: API_KEY_NAME } }
    );

    // Call Coinbase to create session token
    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
        // Optional: clientIp if you can get real IP (for prod security)
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.sessionToken) {
      console.error('Coinbase token error:', data);
      return NextResponse.json({ error: 'Failed to get session token' }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
