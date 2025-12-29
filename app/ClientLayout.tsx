// app/ClientLayout.tsx — CLIENT-SIDE ONLY (wagmi, query, onchainkit)
"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { sdk } from "@coinbase/onchainkit/minikit";
import { base } from "wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi";
import { useEffect } from "react";

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Call ready() when component mounts — dismisses splash screen
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
