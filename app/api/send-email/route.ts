// app/api/send-email/route.ts — FINAL VERSION (sends to buyer + you)
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Email payload:", body);

    const {
      name = "Valued Customer",
      email = "", // ← NEW: buyer's email
      address = "",
      city = "",
      state = "",
      zip = "",
      items,
      amount,
      totalUsd,
      shipping = 0,
      txHash,
    } = body;

    // Build item list
    const itemList = Array.isArray(items)
      ? items.map((i: any) => `• ${i.quantity} × ${i.name}`).join("\n")
      : "Custom Order";

    const buyerEmail = email.trim();
    const hasBuyerEmail = buyerEmail && buyerEmail.includes("@");

    // HTML receipt (beautiful + mobile-friendly)
    const htmlReceipt = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #0a0a0a; color: #fff; border: 3px solid #f5d742;">
        <h1 style="color: #f5d742; text-align: center; font-size: 2.5em;">$CARDS TCG STORE</h1>
        <h2 style="text-align: center; color: #4ade80;">Order Confirmed on Base</h2>
        
        <p style="font-size: 1.2em;">Hey ${name.split(" ")[0]},</p>
        <p>Your order is confirmed and will ship in <strong>24–48 hours</strong>!</p>

        <hr style="border-color: #f5d742; margin: 30px 0;">

        <h3>Items:</h3>
        <pre style="background: #111; padding: 15px; border-radius: 12px; white-space: pre-wrap;">${itemList}</pre>

        <h3>Shipping To:</h3>
        <p style="background: #111; padding: 15px; border-radius: 12px;">
          ${name}<br>
          ${address}<br>
          ${city}, ${state} ${zip}
        </p>

        <h3>Payment:</h3>
        <p>
          <strong>Total:</strong> $${Number(totalUsd).toFixed(2)}<br>
          <strong>Paid with:</strong> ${amount.toLocaleString()} $CARDS<br>
          <strong>Shipping:</strong> $${Number(shipping).toFixed(2)}
        </p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://basescan.org/tx/${txHash}" 
             style="background: #4ade80; color: black; padding: 16px 32px; border-radius: 12px; font-weight: bold; text-decoration: none;">
            View Transaction on Basescan
          </a>
        </p>

        <p style="text-align: center; color: #888; font-size: 0.9em;">
          Questions? Reply to this email or DM @cardsonbase on X.<br>
          Thanks for being an early collector
        </p>
      </div>
    `;

    // Always send to YOU
    const emailPromises = [
      resend.emails.send({
        from: "CARDS Store <orders@cardsonbase.com>",
        to: "cardsonbasehq@gmail.com",
        subject: `NEW ORDER • $${totalUsd} • ${amount.toLocaleString()} $CARDS`,
        text: `New order from ${name} (${buyerEmail})\n\n${itemList}\n\nTotal: $${totalUsd}\nTx: https://basescan.org/tx/${txHash}`,
        html: htmlReceipt,
      }),
    ];

    // Also send receipt to buyer if they gave email
    if (hasBuyerEmail) {
      emailPromises.push(
        resend.emails.send({
          from: "CARDS Store <orders@cardsonbase.com>",
          to: buyerEmail,
          subject: "Your $CARDS TCG Order Receipt – Thank You!",
          html: htmlReceipt,
        })
      );
    }

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}