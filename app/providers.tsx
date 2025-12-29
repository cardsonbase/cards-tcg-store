// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { wagmiConfig } from '@/lib/wagmi';
import { base } from 'wagmi/chains';

import '@rainbow-me/rainbowkit/styles.css';
import '@coinbase/onchainkit/styles.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            wagmiConfig,
            wallet: {
              display: 'modal', // ← THIS LINE IS CRITICAL
            },
            // Optional: brand the modal
            appearance: {
              name: 'CARDS Collectibles',
              // logo: 'https://your-site.com/logo.png', // full URL if you want
              mode: 'dark',
            },
          }}
          miniKit={{ enabled: true }}
        >
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#ffd700',
              accentColorForeground: '#000',
              borderRadius: 'large',
            })}
          >
            {children}
          </RainbowKitProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
