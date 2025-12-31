import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim(); // Your key ID: fbecdb5c-7f71-4015-8028-19742b3b0962
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim(); // Your base64 private key

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Missing API key config' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Generate JWT using official SDK
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
      return NextResponse.json({ error: 'Coinbase failed', details: data }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Server error', msg: err.message }, { status: 500 });
  }
}
