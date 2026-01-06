// middleware.ts (slightly stricter version)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cards-tcg-store.vercel.app',
  'http://localhost:3000', // remove in prod if not needed
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  // Handle preflight
  if (request.method === 'OPTIONS') {
    if (isAllowed) {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', origin!);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // Reject unknown origins explicitly
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  // For non-OPTIONS requests
  const response = NextResponse.next();

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  // If not allowed, we send no ACAO header → browser blocks

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
