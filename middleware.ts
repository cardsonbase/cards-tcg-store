// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = ['https://cards-tcg-store.vercel.app'];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const response = NextResponse.next();

  // Only set ACAO if origin is allowed (removes wildcard)
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  // NOT set * — Vercel default overridden

  response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export const config = {
  matcher: '/',  // Apply to root page (and optionally '/api/:path*' if needed)
};
