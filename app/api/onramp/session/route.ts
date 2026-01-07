import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

// Handles both standard EOA and Coinbase Smart Wallet (ERC-6492) signatures
function isValidSignature(address: string, message: string, signature: string): boolean {
  try {
    const ERC6492_SUFFIX = '6492649264926492649264926492649264926492649264926492';

    if (signature.toLowerCase().endsWith(ERC6492_SUFFIX.toLowerCase())) {
      // Extract the actual signature: last 130 hex chars before the 64-char suffix
      const actualSigHex = '0x' + signature.slice(-130 - 64, -64);
      const recovered = ethers.verifyMessage(message, actualSigHex);
      return recovered.toLowerCase() === address.toLowerCase();
    }

    // Standard signature (MetaMask, etc.)
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

    // Timestamp replay protection
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    const ts = parseInt(timestampMatch[1]);
    const age = Date.now() - ts;
    if (age > 300000 || age < 0) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    // Verify signature (now works with Base Smart Wallet PIN)
    if (!isValidSignature(address, message, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const clientIp = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

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
