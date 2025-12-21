// app/api/total-supply/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('1000000000', {
    headers: { 'Content-Type': 'text/plain' },
  });
}
