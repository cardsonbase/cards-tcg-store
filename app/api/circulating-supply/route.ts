// app/api/circulating-supply/route.ts (Existing - Locked = ~527M with 9 decimals)
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const TOKEN_ADDRESS = '0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d';
const BURN_ADDRESSES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
  // Add any other burn addresses
];
const LOCKED_ADDRESSES = [
  '0x10B5F02956d242aB770605D59B7D27E51E45774C',  // 
  '0x4B52d5C253b7e668a1FB1780C6EF282ACEAEeaa4',    // 
  // Add marketing wallet after locked/non-circulating, currently being used to provide liqudity. 
];
const ABI = ['function balanceOf(address) view returns (uint256)'];

export async function GET() {
  const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, provider);
  let burned = 0n;
  for (const addr of BURN_ADDRESSES) {
    const bal = await contract.balanceOf(addr);
    burned += bal;
  }
  let locked = 0n;
  for (const addr of LOCKED_ADDRESSES) {
    const bal = await contract.balanceOf(addr);
    locked += bal;
  }
  const total = 1000000000000000000n; // 1 billion with 9 decimals
  const existing = total - burned;
  const circulating = existing - locked;
  return NextResponse.json({ circulatingSupply: circulating.toString() });
}
