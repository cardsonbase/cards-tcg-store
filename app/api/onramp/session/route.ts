// app/api/onramp/session/route.ts
import { type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const secretApiKey = process.env.CDP_SECRET_API_KEY;
  if (!secretApiKey) {
    return Response.json({ error: 'Secret API key missing' }, { status: 500 });
  }

  try {
    const { address, chainId } = await request.json();  // From client

    const response = await fetch('https://api.developer.coinbase.com/rpc/v1/onramp/session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: { [address]: [chainId] },  // e.g., { '0x...': ['8453'] } for Base
        assets: ['ETH', 'USDC'],
        presetFiatAmount: 20,  // Optional default
        fiatCurrency: 'USD',
      }),
    });

    if (!response.ok) {
      throw new Error(`CDP API error: ${response.statusText}`);
    }

    const { sessionToken } = await response.json();
    return Response.json({ sessionToken });
  } catch (error) {
    console.error("Session token error:", error);
    return Response.json({ error: 'Failed to generate session' }, { status: 500 });
  }
}
