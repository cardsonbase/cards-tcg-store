// lib/wagmi.ts — Clean v2 Setup (No Manual Wallet Config)
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('You need to add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to .env.local');
}

export const wagmiConfig = getDefaultConfig({
  appName: '$CARDS TCG Store',
  projectId,
  chains: [base],
});