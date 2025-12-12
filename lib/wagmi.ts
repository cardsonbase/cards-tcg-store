// lib/wagmi.ts — 100% WORKING FOR NEXT.JS 14 + WAGMI 2 + BASE
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [base],                     // ← THIS WAS MISSING THE ]
  transports: {
    [base.id]: http(),
  },
});