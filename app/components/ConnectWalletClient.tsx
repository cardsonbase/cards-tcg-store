// app/components/ConnectWalletClient.tsx
"use client";

import { ConnectWallet, WalletDropdown } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";

export default function ConnectWalletClient() {
  const { isConnected } = useAccount();

  return (
    <>
      {/* Desktop version */}
      <div className="hidden sm:block">
        <ConnectWallet
          className="connect-wallet-btn"
          disconnectedLabel="Connect Wallet"
        />
      </div>

      {/* Mobile version */}
      <div className="block sm:hidden">
        <ConnectWallet
          className="mobile-connect-btn"
          disconnectedLabel="Connect Wallet"
        />
      </div>

      {/* Wallet Dropdown for connected state */}
      {isConnected && <WalletDropdown />}
    </>
  );
}