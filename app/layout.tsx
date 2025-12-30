// app/layout.tsx
import '@coinbase/onchainkit/styles.css';
import "../styles/globals.css";  // ← Your moved CSS import
import { Metadata } from "next";
import { Providers } from "./providers";  // wagmi + OnchainKit wrapper

export const metadata: Metadata = {
  title: "$CARDS TCG Store",
  description: "The first Direct Onchain RWA TCG collectibles store on Base",
  openGraph: {
    title: "$CARDS TCG Store",
    description: "The first Onchain RWA TCG collectibles store on Base",
    images: ["/og.png"],
    url: "https://cards-tcg-store.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
  other: {
    "base:app_id": "6939fa888a7c4e55fec73d3e",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico?v=2" />
        <meta name="base:app_id" content="6939fa888a7c4e55fec73d3e" />
      </head>
      <body>
        <Providers>
          {children}  {/* ← Directly render children here */}

          <footer className="border-t border-gray-800 mt-16 py-8 text-center text-sm text-gray-500">
            <a href="/terms" className="underline hover:text-white">Terms of Service</a>
            {" • "}
            <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
