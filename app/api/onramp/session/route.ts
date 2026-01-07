// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

// Handles both standard EOA signatures and Coinbase Smart Wallet ERC-6492 wrapped signatures
function isValidSignature(
  address: string,
  message: string,
  signature: string
): boolean {
  try {
    // ERC-6492 detection: signature ends with this magic bytes (hex)
    const ERC6492_SUFFIX = '6492649264926492649264926492649264926492649264926492';
    if (signature.toLowerCase().endsWith(ERC6492_SUFFIX.toLowerCase())) {
      // Extract the actual signature (last 130 characters = 65 bytes hex)
      const actualSigHex = '0x' + signature.slice(-130);
      const recovered = ethers.verifyMessage(message, actualSigHex);
      return recovered.toLowerCase() === address.toLowerCase();
    }

    // Standard personal_sign (MetaMask, etc.)
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

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

    // Replay protection via timestamp in message
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    const ts = parseInt(timestampMatch[1]);
    const age = Date.now() - ts;
    if (age > 300000 || age < 0) { // 5 minutes
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    // Verify signature — now supports Coinbase Smart Wallet
    if (!isValidSignature(address, message, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Get client IP
    const clientIp = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

    // Generate JWT for Coinbase API
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    // Request session token
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
      return NextResponse.json({ error: 'Failed to generate session token' }, { status: 500 });
    }

    return NextResponse.json({ sessionToken: data.token });
  } catch (err: any) {
    console.error('Onramp session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
