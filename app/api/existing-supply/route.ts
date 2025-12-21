// app/api/existing-supply/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const TOKEN_ADDRESS = '0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d';

const BURN_ADDRESSES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
  // Add burn wallets
];

const ABI = ['function balanceOf(address) view returns (uint256)'];

export async function GET() {
  const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);
  let burned = 0n;
  for (const addr of BURN_ADDRESSES) {
    const bal = await contract.balanceOf(addr);
    burned += bal;
  }
  const total = 1000000000000000000n; // 1B with 9 decimals: 1e9 * 1e9
  const existing = total - burned;

  // Format as decimal string like exchanges (9 decimals)
  const existingStr = (Number(existing) / 1e9).toFixed(9);

  return new NextResponse(existingStr, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
