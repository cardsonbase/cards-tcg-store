// /app/api/auth/route.ts

import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

const client = createClient();

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }

  try {
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });

    const userFid = payload.sub;

    return NextResponse.json({ userFid });
  } catch (e) {
    let message = "Internal server error";
    let status = 500;

    if (e instanceof Errors.InvalidTokenError) {
      message = "Invalid token";
      status = 401;
    } else if (e instanceof Error) {
      message = e.message;
    }

    return NextResponse.json({ message }, { status });
  }
}

// Keep your getUrlHost helper if needed
function getUrlHost(request: NextRequest) {
  // ... (unchanged)
}
