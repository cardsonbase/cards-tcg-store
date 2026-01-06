// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = ['https://cards-tcg-store.vercel.app']; // Add more if needed, e.g. localhost for dev

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const response = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin); // Reflect exact origin
  } else {
    // Optionally block unknown origins
    // response.headers.set('Access-Control-Allow-Origin', 'null');
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  );
  // Cache preflight for 24 hours
  response.headers.set('Access-Control-Max-Age', '86400');

  // Handle preflight early
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*', // Apply only to your API routes
};
