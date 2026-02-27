import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const DATA_SUFFIX = '0x62635f7873737631786a650b0080218021802180218021802180218021' as `0x${string}`;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),  // First = auto-injects in Farcaster (no popup)
    coinbaseWallet({
      appName: 'CARDS TCG Store',
      preference: 'all',  // Fallback for browser/Base app
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
  dataSuffix: DATA_SUFFIX,
});
