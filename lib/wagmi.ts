import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { Attribution } from 'ox/erc8021';  

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [bc_xssv1xje],
});

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
