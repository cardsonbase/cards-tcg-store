// lib/wagmi.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local');
}

export const wagmiConfig = getDefaultConfig({
  appName: '$CARDS TCG Store',
  projectId,
  chains: [base],
  ssr: true,  // Add this back for Next.js SSR (Turbopack supports it in latest versions)
});