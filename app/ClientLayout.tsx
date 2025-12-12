// app/ClientLayout.tsx — FIXED: Providers + Responsive Wallet Only
"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi";
import ConnectWalletClient from "./components/ConnectWalletClient";

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
        >
          {/* FIXED: Simple, responsive wallet bar — no full header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-yellow-400/30 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-end">
              <ConnectWalletClient />
            </div>
          </div>

          {/* Content area — push below wallet bar */}
          <main className="pt-16 min-h-screen">
            {children}
          </main>

          {/* FIXED Footer — always visible, responsive */}
          <footer className="border-t border-gray-800 bg-black/50 py-6 text-center text-sm text-gray-400 fixed bottom-0 left-0 right-0 z-40">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/terms" className="underline hover:text-yellow-400">Terms of Service</a>
              <span>•</span>
              <a href="/privacy" className="underline hover:text-yellow-400">Privacy Policy</a>
              <span>•</span>
              <a href="https://x.com/cardsonbase" className="underline hover:text-yellow-400 flex items-center gap-1">
                🐦 X
              </a>
            </div>
          </footer>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}