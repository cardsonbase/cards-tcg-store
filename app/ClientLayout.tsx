// app/ClientLayout.tsx — FINAL + MOBILE FIXED
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
          {/* FIXED HEADER — visible on mobile + desktop */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-yellow-400/30">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-black text-yellow-400 tracking-tighter">
                $CARDS TCG Store
              </h1>

              {/* Wallet Connect — always visible */}
              <ConnectWalletClient />
            </div>
          </header>

          {/* Push content below header */}
          <main className="pt-24 min-h-screen">
            {children}
          </main>

          {/* Optional: mobile-friendly footer */}
          <footer className="border-t border-gray-800 py-8 text-center text-xs sm:text-sm text-gray-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/terms" className="underline hover:text-white">Terms</a>
              <span>•</span>
              <a href="/privacy" className="underline hover:text-white">Privacy</a>
              <span>•</span>
              <a href="https://x.com/cardsonbase" className="underline hover:text-white">X</a>
            </div>
          </footer>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}