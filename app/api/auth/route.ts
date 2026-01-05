// /app/api/auth/route.ts

import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

const client = createClient();

const ALLOWED_ORIGINS = [
  'https://cards-tcg-store.vercel.app',
];

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Reject unknown origins early
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('CORS origin not allowed', { status: 403 });
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    const res = NextResponse.json({ message: "Missing token" }, { status: 401 });
    if (origin) res.headers.set('Access-Control-Allow-Origin', origin);
    return res;
  }

  try {
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });

    const userFid = payload.sub;

    const res = NextResponse.json({ userFid });
    if (origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET');
      res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    return res;

  } catch (e) {
    let message = "Internal server error";
    let status = 500;

    if (e instanceof Errors.InvalidTokenError) {
      message = "Invalid token";
      status = 401;
    } else if (e instanceof Error) {
      message = e.message;
    }

    const res = NextResponse.json({ message }, { status });
    if (origin) res.headers.set('Access-Control-Allow-Origin', origin);
    return res;
  }
}

// Handle preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],  // Your domain only
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Bad origin — no ACAO header at all
  return new NextResponse('CORS origin not allowed', { status: 403 });
}

function getUrlHost(request: NextRequest) {
  // ... (keep your existing function unchanged)
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  const host = request.headers.get("host");
  if (host) {
    return host;
  }

  let urlValue: string;
  if (process.env.VERCEL_ENV === "production") {
    urlValue = process.env.NEXT_PUBLIC_URL!;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "http://localhost:3000";
  }

  const url = new URL(urlValue);
  return url.host;
}
