// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';
import { recoverAddress, hashMessage } from 'ethers'; // ethers v6

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();

    // Expect: { address, message, signature }
    const { address, message, signature } = body;

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing authentication fields' }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Optional: Basic replay protection — reject old signatures
    // Message should contain a timestamp, e.g., "Authenticate to fund wallet\nTimestamp: 1736112345678"
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (timestampMatch) {
      const ts = parseInt(timestampMatch[1]);
      const age = Date.now() - ts;
      if (age > 5 * 60 * 1000 || age < 0) { // 5-minute window
        return NextResponse.json({ error: 'Signature expired or invalid' }, { status: 401 });
      }
    }

    // Verify signature
    let recovered;
    try {
      recovered = await recoverAddress(hashMessage(message), signature);
    } catch {
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
    }

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Signature does not match address' }, { status: 401 });
    }

    // Get client IP
    const clientIp = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

    // Generate JWT for Coinbase
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    // Call Coinbase — use the authenticated address for funding
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
