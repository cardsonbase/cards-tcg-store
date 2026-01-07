// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';
import { verifyMessage } from '@ambire/signature-validator'; // <--- New import

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing authentication fields' }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Timestamp replay protection
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    const ts = parseInt(timestampMatch[1]);
    const age = Date.now() - ts;
    if (age > 300000 || age < 0) { // 5 minutes
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    // Verify with Ambire library — handles EOA, ERC-1271, and ERC-6492 (Smart Wallet) automatically
    const isValid = await verifyMessage({
      signer: address,
      message: message,
      signature: signature,
      provider: ethers.getDefaultProvider('base'), // or any Base RPC — needed for deployed contract checks
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Get client IP
    const clientIp = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

    // Generate JWT and call Coinbase
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

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
      console.error('Coinbase error:', coinbaseResponse.status, data);
      return NextResponse.json({ error: 'Failed to generate session token' }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.token });
  } catch (err: any) {
    console.error('Onramp session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
