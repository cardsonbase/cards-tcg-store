"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { wagmiConfig } from '@/lib/wagmi';
import { base } from 'wagmi/chains';

import '@coinbase/onchainkit/styles.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  console.log("CDP Project ID:", process.env.NEXT_PUBLIC_CDP_PROJECT_ID)
  console.log("OnchainKit API Key:", process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY);
  
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
          chain={base}
          config={{
            wallet: {
              display: 'modal', // Required for custom render to open modal
            },
            appearance: {
              mode: 'dark',
            },
          }}
          miniKit={{ enabled: true }} // Keeps your mini app support
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
