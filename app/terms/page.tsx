// app/terms/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service / $CARDS TCG Store",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 prose prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-sm opacity-70">Last updated: December 12, 2025</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using https://cards-tcg-store.vercel.app (the “Site”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Site.
      </p>

      <h2>2. Nature of Products</h2>
      <p>
        We sell authentic, previously-owned (second-hand) trading card game products including graded slabs, sealed booster packs, boxes, and tins from various manufacturers (Pokémon, Magic: The Gathering, Yu-Gi-Oh!, etc.).  
        We are an independent secondary-market retailer and are not affiliated with, endorsed by, or sponsored by The Pokémon Company, Wizards of the Coast, Konami, or any other brand owner.
      </p>

      <h2>3. Images & Trademarks</h2>
      <p>
        All product images are used for identification purposes only under fair-use principles. Trademarks and copyrights remain the property of their respective owners.
      </p>

      <h2>4. Pricing & Payment</h2>
      <p>
        Prices are listed in USD. We accept cryptocurrency via Base (ETH, USDC, etc.) and fiat on-ramps.  
        All payments are processed on-chain or through third-party providers. Gas/network fees are the buyer’s responsibility and are non-refundable.
      </p>

      <h2>5. On-Chain Transactions are Final</h2>
      <p>
        Once an on-chain transaction is confirmed, the sale is final and irreversible. No refunds or cancellations are possible after broadcast.
      </p>

      <h2>6. Physical Shipping & Delivery</h2>
      <p>
        Physical items ship within 3 business days of payment confirmation. Tracking is provided.  
        Buyer is responsible for providing a correct shipping address. Lost or undeliverable packages due to incorrect addresses are not eligible for refund.  
        Risk of loss passes to buyer upon delivery to the carrier.
      </p>

      <h2>7. Grading Authenticity</h2>
      <p>
        All graded slabs are guaranteed authentic from PSA, BGS, CGC, or other major grading companies. We do not re-grade or authenticate raw cards unless explicitly stated.
      </p>

      <h2>8. Refunds & Returns</h2>
      <p>
         On-chain purchases: no refunds  
         Physical items: 7-day return window only if item is not as described and returned in original condition (buyer pays return shipping)  
         No refunds for buyer remorse or change of mind
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, $CARDS TCG Store total liability shall not exceed the amount paid by you for the item in question.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These terms are governed by the laws of the United States and the State of Louisana. Any disputes shall be resolved in the courts of The United States/Lousiana.
      </p>

      <h2>11. Changes to Terms</h2>
      <p>
        We may update these terms at any time. Continued use of the Site after changes constitutes acceptance.
      </p>

      <p className="mt-12 text-sm opacity-70">
        Questions? Contact us at [cardsonbasehq@gmail.com or https://x.com/cardsonbaseHQ]
      </p>
    </div>
  );
}