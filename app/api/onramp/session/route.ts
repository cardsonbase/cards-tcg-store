import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_KEY_NAME = process.env.CDP_SECRET_API_KEY_NAME;
const PRIVATE_KEY = process.env.CDP_SECRET_API_KEY;

export async function POST(request: Request) {
  try {
    if (!API_KEY_NAME || !PRIVATE_KEY) {
      console.error('Missing env vars:', { hasName: !!API_KEY_NAME, hasKey: !!PRIVATE_KEY });
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    console.log('Generating JWT for address:', address);

    const payload = {
      iss: API_KEY_NAME,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,  // 60 seconds
      uri: 'https://api.developer.coinbase.com/onramp/v1/token',
    };

    const jwtToken = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
      header: { kid: API_KEY_NAME },
    });

    console.log('JWT generated');

    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
      }),
    });

    const data = await res.json();
    console.log('Coinbase response status:', res.status, 'data:', data);

    if (!res.ok || !data.sessionToken) {
      return NextResponse.json({ error: 'Failed to get token', details: data }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (err: any) {
    console.error('Session token error:', err);
    return NextResponse.json({ error: 'Server error', message: err.message }, { status: 500 });
  }
}
