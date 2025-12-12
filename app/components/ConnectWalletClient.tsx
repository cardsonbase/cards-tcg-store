// app/components/ConnectWalletClient.tsx — FIXED: only shows Disconnect when actually connected
"use client";

import { useEffect, useState } from "react";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useDisconnect } from "wagmi";

export default function ConnectWalletClient() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount(); // ← use isConnected, not just address
  const { disconnect } = useDisconnect();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="w-48 h-16 bg-gray-800 rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  // Only show Disconnect button if wallet is ACTUALLY connected right now
  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="bg-yellow-400 hover:bg-yellow-300 text-black px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition"
      >
        Disconnect
      </button>
    );
  }

  // Otherwise show the beautiful OnchainKit Connect button
  return <ConnectWallet />;
}