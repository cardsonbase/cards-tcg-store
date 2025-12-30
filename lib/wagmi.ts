import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';  // Direct Wagmi connector for Coinbase Smart Wallet

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'CARDS TCG Store',
      preference: 'smartWalletOnly',  // Focus on Smart Wallet for Base ecosystem
      version: '4',  // Latest for 2025; supports advanced features
    }),
    // Add more if needed (e.g., injected() for MetaMask), but keep minimal for conformity
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});
