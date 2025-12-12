// app/api/auto-swap/route.ts — FINAL: INSTANT PUSH + EMAIL + ONE-TAP SWAP
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawHex = body.rawValue || "0x0";
    const txHash = body.txHash || "unknown";

    // Convert to $CARDS amount (9 decimals)
    const weiAmount = Number.parseInt(rawHex, 16);
    const amountTokens = Math.floor(weiAmount / 1e9);

    const router = "0x4752ba5dbc23f44d59ec2f42a8d7b5c7c14f4a7f";

    const calldata = `0x38ed1739` +
      "00000000000000000000000065f3d0b7a1071d4f9aad85957d8986f5cff9ab3d" +
      rawHex.slice(2).padStart(64, "0") +
      "000000000000000000000000862fa56aA3477ED1f9AEe5D712B816027b263f2f" +
      "0000000000000000000000000000000000000000000000000000000000000000" +
      "00000000000000000000000000000000000000000000000000000000693a2b00";

    // INSTANT PUSH NOTIFICATION
    await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: process.env.PUSHOVER_API_TOKEN,
        user: process.env.PUSHOVER_USER_KEY,
        title: "🟡 SWAP READY",
        message: `${amountTokens.toLocaleString()} $CARDS → ETH\nTx: ${txHash.slice(0, 10)}...\nONE TAP NOW`,
        sound: "cashregister",
        priority: 2,
        url: `https://basescan.org/tx/${txHash}`,
      }),
    });

    // INSTANT EMAIL
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CARDS Bot <orders@cardsonbase.com>",
        to: "cardsonbasehq@gmail.com",
        subject: `🟡 SWAP READY — ${amountTokens.toLocaleString()} $CARDS → ETH`,
        html: `
          <h1 style="color:#ffd700">SWAP READY</h1>
          <p><strong>Amount:</strong> ${amountTokens.toLocaleString()} $CARDS</p>
          <p><strong>Tx:</strong> <a href="https://basescan.org/tx/${txHash}">${txHash}</a></p>
          <hr>
          <h2 style="color:#00ff9d">ONE-TAP SWAP</h2>
          <p><strong>To:</strong> ${router}</p>
          <p><strong>Value:</strong> 0 ETH</p>
          <p><strong>Data:</strong><br><code style="background:#222;padding:10px;border-radius:8px;display:block;word-break:break-all;font-size:12px">${calldata}</code></p>
          <p><strong>Gas Limit:</strong> 350000</p>
          <p style="color:#00ff9d;font-weight:bold">→ Coinbase Wallet → Send → Advanced → Paste To + Data → SIGN</p>
        `,
      }),
    });

    return NextResponse.json({
      success: true,
      amountTokens,
      swapTo: router,
      swapData: calldata,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}