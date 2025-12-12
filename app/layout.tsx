// app/layout.tsx  ← ONLY PLACE WITH METADATA (server component)
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "$CARDS TCG Store",
  description: "The first On-Chain RWA TCG collectibles store",
  openGraph: {
    title: "$CARDS TCG Store",
    description: "The first On-Chain RWA TCG collectibles store",
    images: ["/og.png"],
    url: "https://cards-on-base.vercel.app",        // ← change to your real domain later
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}