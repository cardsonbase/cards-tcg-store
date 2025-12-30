import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';  // Add this

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),  // First = auto-injects in Farcaster (no popup!)
    coinbaseWallet({
      appName: '$CARDS TCG Store',
      preference: 'all',  // Fallback for browser/Base app
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});
