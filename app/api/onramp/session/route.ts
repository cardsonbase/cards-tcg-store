// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe'; // npm install siwe

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

const ALLOWED_ORIGIN = 'https://cards-tcg-store.vercel.app';

// Strict CORS helper
function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin === ALLOWED_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function isValidEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export async function POST(request: NextRequest) {
  let response = new NextResponse();

  try {
    const body = await request.json();
    const { message, signature, address } = body;

    // Basic validation
    if (!message || !signature || !address || !isValidEthereumAddress(address)) {
      response = NextResponse.json({ error: 'Invalid request: missing or invalid fields' }, { status: 400 });
      return addCorsHeaders(response, request);
    }

    // Verify SIWE signature
    const siwe = new SiweMessage(message);
    const { success, data } = await siwe.verify({ signature, domain: 'cards-tcg-store.vercel.app', nonce: message.nonce });

    if (!success || data.address.toLowerCase() !== address.toLowerCase()) {
      response = NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      return addCorsHeaders(response, request);
    }

    // Optional: Additional checks (recommended)
    // if (new Date(data.expirationTime) < new Date()) { ... expired ... }

    // CDP keys
    if (!API_KEY_ID || !API_KEY_SECRET) {
      response = NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      return addCorsHeaders(response, request);
    }

    // Client IP
    const clientIp = request.ip || '127.0.0.1';

    // Generate session token for the authenticated address
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
      console.error('Coinbase error:', data);
      response = NextResponse.json({ error: 'Failed to get session token' }, { status: 500 });
      return addCorsHeaders(response, request);
    }

    response = NextResponse.json({ sessionToken: data.token });
    return addCorsHeaders(response, request);
  } catch (err: any) {
    console.error('Onramp session error:', err);
    response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, request);
}
