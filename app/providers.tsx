// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { wagmiConfig } from '@/lib/wagmi';
import { base } from 'wagmi/chains'; // or viem/chains if you use viem

import '@rainbow-me/rainbowkit/styles.css';
import '@coinbase/onchainkit/styles.css'; // Required for OnchainKit components

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} // Optional but recommended
          chain={base}
          config={{
            wagmiConfig, // ← Important: pass your existing wagmi config
          }}
          miniKit={{ enabled: true }} // ← This enables useMiniKit() and setFrameReady()
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
