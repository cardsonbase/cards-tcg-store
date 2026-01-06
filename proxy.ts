// proxy.ts — Strict CORS for maximum CDP compliance

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cards-tcg-store.vercel.app',
];

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowed = origin !== null && ALLOWED_ORIGINS.includes(origin);

  // Handle preflight OPTIONS
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

    // Bad origin → explicit reject, no CORS headers
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  // For real requests (POST, GET, etc.)
  const response = NextResponse.next();

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  // No ACAO header for bad origins → browser blocks automatically

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
