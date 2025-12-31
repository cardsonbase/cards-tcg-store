import { NextResponse, NextRequest } from 'next/server';
import { sign } from '@noble/ed25519';
import { randomBytes } from 'crypto';

const API_KEY_ID = process.env.CDP_SECRET_API_KEY_NAME?.trim(); 
const PRIVATE_KEY_BASE64 = process.env.CDP_SECRET_API_KEY_PRIVATE_KEY?.trim();

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY_ID || !PRIVATE_KEY_BASE64) {
      console.error('Missing API key ID or private key');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { address } = await request.json();
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Extract client IP (required; handle private IPs for local dev)
    let clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || request.ip || 'unknown';
    const privateIpRegex = /^(127\.0\.0\.1|localhost|::1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)$/;
    if (privateIpRegex.test(clientIp) || clientIp === 'unknown') {
      clientIp = '192.0.2.1'; // Test public IP (RFC 5737 example)
      console.debug('Using test IP for dev');
    }

    // Generate nonce (16-char hex)
    const nonce = randomBytes(8).toString('hex');

    // JWT Header
    const header = {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: API_KEY_ID,
      nonce,
    };

    // JWT Payload (2025 spec)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'cdp',
      aud: ['cdp_service'],
      nbf: now,
      exp: now + 120, // 2 min
      sub: API_KEY_ID,
      nonce,
      uri: 'POST api.developer.coinbase.com/onramp/v1/token',
    };

    // Base64url encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Sign (extract 32-byte seed from base64 key)
    const privateKeyBytes = Buffer.from(PRIVATE_KEY_BASE64, 'base64');
    const seed = privateKeyBytes.slice(0, 32);
    const message = `${encodedHeader}.${encodedPayload}`;
    const signature = await sign(Buffer.from(message), seed);
    const encodedSignature = Buffer.from(signature).toString('base64url');

    // Full JWT
    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    console.log('Generated JWT (first 50 chars):', token.slice(0, 50) + '...');

    // Fetch session token
    const res = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
        clientIp,
      }),
    });

    const data = await res.json();

    console.log('Coinbase response status:', res.status);
    console.log('Coinbase response body:', data);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Coinbase token failed', details: data, status: res.status },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionToken: data.token }); // Updated to 'token' per 2025 response
  } catch (error: any) {
    console.error('JWT signing or fetch error:', error);
    return NextResponse.json({ error: 'Server error', msg: error.message }, { status: 500 });
  }
}
