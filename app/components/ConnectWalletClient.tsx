// app/components/ConnectWalletClient.tsx
"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";

export default function ConnectWalletClient() {
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // prevents hydration issues

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

  // This is the magic — pure OnchainKit component, no extra wrappers
  return <ConnectWallet />;
}