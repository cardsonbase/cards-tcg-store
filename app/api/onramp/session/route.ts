// /app/api/onramp/session/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { createClient } from '@farcaster/quick-auth';
import { ethers } from 'ethers'; // Add this dependency: npm install ethers

const API_KEY_ID = process.env.CDP_API_KEY_ID?.trim();
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET?.trim();

const client = createClient();

// Verify Farcaster JWT and return userFid (FID as string)
async function verifyAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = await client.verifyJwt({ token });
    return payload.sub; // This is the user's FID (string)
  } catch (e) {
    return null;
  }
}

// Optional: Future DB lookup — replace with real implementation when ready
async function getStoredAddressForFid(userFid: string): Promise<string | null> {
  // Example (Prisma):
  // const user = await prisma.user.findUnique({ where: { fid: Number(userFid) } });
  // return user?.address ?? null;

  // For now: no stored address
  return null;
}

// Validate Ethereum address (checksummed EIP-55 format)
function isValidEthereumAddress(address: string): boolean {
  try {
    return ethers.isAddress(address); // Handles checksum validation safely
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication — require valid Farcaster login
    const authorization = request.headers.get('Authorization');
    const userFid = await verifyAuth(authorization);

    if (!userFid) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
    }

    // 2. Validate CDP API keys
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 3. Get true client IP (required by Coinbase)
    const clientIp = request.ip;
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to determine client IP' }, { status: 400 });
    }

    // 4. Determine wallet address securely
    let address: string;

    // Preferred: Use stored address from DB (most secure)
    const storedAddress = await getStoredAddressForFid(userFid);
    if (storedAddress && isValidEthereumAddress(storedAddress)) {
      address = storedAddress;
    } else {
      // Fallback: Accept client-provided address (safe because endpoint is authenticated)
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const clientAddress = body.address?.trim();
      if (!clientAddress || !isValidEthereumAddress(clientAddress)) {
        return NextResponse.json({ error: 'Invalid or missing wallet address' }, { status: 400 });
      }

      address = clientAddress;
    }

    // 5. Generate JWT for Coinbase API
    const jwtToken = await generateJwt({
      apiKeyId: API_KEY_ID,
      apiKeySecret: API_KEY_SECRET,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
    });

    // 6. Request session token from Coinbase
    const coinbaseResponse = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['base'] }],
        assets: ['ETH', 'USDC'],
        clientIp, // Required for fraud detection
      }),
    });

    const data = await coinbaseResponse.json();

    console.log('Coinbase Onramp Token Response:', coinbaseResponse.status, data);

    if (!coinbaseResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to generate session token', details: data },
        { status: 500 }
      );
    }

    // 7. Success — return only the session token
    return NextResponse.json({ sessionToken: data.token });
  } catch (err: any) {
    console.error('Onramp session error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 }
    );
  }
}

// Optional: Handle preflight CORS (Next.js middleware usually handles this)
// But safe to leave empty if you're using middleware.ts for CORS
export const OPTIONS = async () => {
  return new NextResponse(null, { status: 204 });
};
