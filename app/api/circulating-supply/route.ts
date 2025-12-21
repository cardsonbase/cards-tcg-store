import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Base RPC (public)
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

const TOKEN_ADDRESS = '0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d';

// Add all your burn addresses here (0xdead, any manual burns)
const BURN_ADDRESSES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
  // Add more if you have other burn wallets
];

const ABI = ['function balanceOf(address) view returns (uint256)'];

export async function GET() {
  const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);

  let burned = 0n;

  for (const addr of BURN_ADDRESSES) {
    try {
      const balance = await contract.balanceOf(addr);
      burned += balance;
    } catch (e) {
      console.error(`Failed to fetch balance for ${addr}`);
    }
  }

  const total = 1000000000000000000n; // 1 billion with 9 decimals
  const circulating = total - burned;

  return NextResponse.json({
    circulatingSupply: circulating.toString(),
  });
}
