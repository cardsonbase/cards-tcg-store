// app/privacy/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – $CARDS TCG Store",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 prose prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-sm opacity-70">Last updated: December 12, 2025</p>

      <h2>What We Collect</h2>
      <p>We only collect:</p>
      <ul>
        <li>Your name and shipping address (for physical orders)</li>
        <li>Your email address (to send order confirmation)</li>
        <li>Your wallet address (for on-chain payment)</li>
        <li>Order details and transaction hashes</li>
      </ul>

      <h2>How We Use It</h2>
      <p>
        We use your information only to fulfill and ship your order. We do not sell, rent, or share your data with anyone else.
      </p>

      <h2>On-Chain Data</h2>
      <p>
        Your wallet address and transaction details are permanently recorded on Base (public blockchain). This cannot be deleted.
      </p>

      <h2>Third Parties</h2>
      <p>
        We use Firebase (Google) for inventory and Resend for email service. Both are GDPR/CCPA compliant.
      </p>

      <h2>Your Rights</h2>
      <p>
        You can request deletion of your shipping/email data by contacting us. On-chain records cannot be removed.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? DM https://x.com/cardsonbaseHQ on X or email cardsonbasehq@gmail.com.
      </p>
    </div>
  );
}