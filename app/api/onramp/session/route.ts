// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';
import { verifyMessage } from '@ambire/signature-validator';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

// Optional: Use a public Base RPC if needed (Vercel allows outbound)
const BASE_RPC_URL = 'https://mainnet.base.org'; // Public endpoint

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API keys
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Parse body
    const body = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing authentication fields' }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // 3. Replay protection: check timestamp in message
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    const ts = parseInt(timestampMatch[1]);
    const age = Date.now() - ts;
    if (age > 300000 || age < 0) { // 5-minute window
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    // 4. Verify signature — supports EOA, ERC-1271, and ERC-6492 (Smart Wallet)
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const isValid = await verifyMessage({
      signer: address,
      message,
      signature,
      provider,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 5. Get reliable client IP (Vercel-compatible)
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = request.ip ?? (forwarded ? forwarded.split(',')[0].trim() : null);

    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

    // 6. Generate JWT for Coinbase Onramp API
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    // 7. Call Coinbase to get session token
    const coinbaseResponse = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
        clientIp,
      }),
    });

    const data = await coinbaseResponse.json();

    if (!coinbaseResponse.ok) {
      console.error('Coinbase API error:', coinbaseResponse.status, data);
      return NextResponse.json(
        { error: 'Failed to generate session token', details: data },
        { status: 500 }
      );
    }

    // 8. Success — return session token
    return NextResponse.json({ sessionToken: data.token });
  } catch (err: any) {
    console.error('Onramp session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
