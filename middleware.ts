// middleware.ts (project root)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = ['https://cards-tcg-store.vercel.app'];

export function middleware(request: NextRequest) {
  // Clone the request
  const response = NextResponse.next();

  const origin = request.headers.get('origin');

  // Remove any default Vercel wildcard
  response.headers.delete('Access-Control-Allow-Origin');

  // Only set if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  // For preflight
  if (request.method === 'OPTIONS') {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } else {
      return new NextResponse(null, { status: 403 });
    }
  }

  return response;
}

// Apply to ALL paths (including root and static)
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
