// proxy.ts — Strict CORS for CDP compliance

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cards-tcg-store.vercel.app',
];

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowed = origin !== null && ALLOWED_ORIGINS.includes(origin);

  // Handle preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    if (isAllowed) {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', origin!);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }

    // Reject unknown origins — no CORS headers
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  // For actual requests
  const response = NextResponse.next();

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  // No ACAO for bad origins → browser blocks

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
