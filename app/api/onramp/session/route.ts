// /app/api/onramp/session/route.ts  (Next.js 13+ app router)

import { NextResponse, NextRequest } from 'next/server';
import { sign } from '@noble/ed25519';
import { randomBytes } from 'crypto';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const PRIVATE_KEY_BASE64 = process.env.CDP_API_KEY_SECRET?.trim();

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY_ID || !PRIVATE_KEY_BASE64) {
      console.error('Missing API key ID or secret');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Generate nonce (16 hex chars)
    const nonce = randomBytes(8).toString('hex');

    const now = Math.floor(Date.now() / 1000);

    // Header
    const header = {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: API_KEY_ID,
      nonce,
    };

    // Payload - exact per 2025 docs
    const payload = {
      iss: 'cdp',
      sub: API_KEY_ID,
      aud: ['cdp_service'],
      nbf: now,
      exp: now + 120,
      nonce,
      uri: 'POST api.developer.coinbase.com/onramp/v1/token',
    };

    // Encode
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const message = `${encodedHeader}.${encodedPayload}`;

    // Sign with Ed25519 seed (first 32 bytes of base64 key)
    const privateKeyBytes = Buffer.from(PRIVATE_KEY_BASE64, 'base64');
    if (privateKeyBytes.length !== 64) {
      console.error('Invalid key length - expected 64 bytes');
      return NextResponse.json({ error: 'Invalid key' }, { status: 500 });
    }
    const seed = privateKeyBytes.slice(0, 32);
    const signature = await sign(Buffer.from(message), seed);
    const encodedSignature = Buffer.from(signature).toString('base64url');

    const jwtToken = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    // Call Coinbase
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

    console.log('Coinbase status:', res.status);
    console.log('Coinbase response:', data);

    if (!res.ok) {
      return NextResponse.json({ error: 'Coinbase failed', details: data }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.sessionToken }); // or data.token if changed
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Server error', msg: err.message }, { status: 500 });
  }
}
