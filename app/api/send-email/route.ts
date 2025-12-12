// app/api/send-email/route.ts — 100% WORKING
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Email payload:", body);

    const {
      name = "Unknown",
      address = "",
      city = "",
      state = "",
      zip = "",
      isInternational = false,
      items,
      productName,
      quantity = 1,
      amount,
      totalUsd,
      shipping,
      txHash,
    } = body;

    const itemList = Array.isArray(items)
      ? items.map((i: any) => `${i.quantity} × ${i.name}`).join("\n")
      : `${quantity} × ${productName || "Item"}`;

    await resend.emails.send({
      from: "CARDS Store <orders@cardsonbase.com>",
      to: "cardsonbasehq@gmail.com",
      subject: `NEW ORDER • $${totalUsd} • ${amount.toLocaleString()} $CARDS`,
      text: `
NEW ORDER!

Items:
${itemList}

Total: $${totalUsd}
Paid: ${amount.toLocaleString()} $CARDS
Tx: https://basescan.org/tx/${txHash}

Shipping:
${name}
${address}
${city}, ${state} ${zip}
International: ${isInternational ? "YES" : "No"}
      `.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}