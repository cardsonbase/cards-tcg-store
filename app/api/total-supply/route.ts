import { NextResponse } from 'next/server';

const TOTAL_SUPPLY = '1000000000000000000'; // 1 billion with 9 decimals

export async function GET() {
  return NextResponse.json({ totalSupply: TOTAL_SUPPLY });
}
