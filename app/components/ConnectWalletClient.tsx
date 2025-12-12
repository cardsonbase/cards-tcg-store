// app/components/ConnectWalletClient.tsx
"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function ConnectWalletClient() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (connected) {
                return (
                  <button
                    onClick={openAccountModal}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition"
                  >
                    {account.displayName}
                  </button>
                );
              }

              return (
                <button
                  onClick={openConnectModal}
                  className="bg-yellow-400 hover:bg-yellow-300 text-black px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition"
                >
                  Connect Wallet
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}