import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN = 'https://cards-tcg-store.vercel.app';

export function middleware(request: NextRequest) {
  // Only apply to your API route
  if (request.nextUrl.pathname.startsWith('/api/onramp/session')) {
    const response = NextResponse.next();

    // For actual responses
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    response.headers.set('Access-Control-Allow-Methods', 'POST');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/onramp/session',
};
