"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, parseEther } from "viem";
import { db } from "@/lib/firebase";
import { ref, runTransaction } from "firebase/database";
import { useCart } from "@/lib/cart";

const TOKEN_ADDRESS = "0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d" as const;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const; // USDC on Base (6 decimals)
const RECEIVE_WALLET = "0x862fa56aA3477ED1f9AEe5D712B816027b263f2f" as const;
const CARDS_DECIMALS = 9;

export default function Cart({
  cardsPriceUsd,
  onClose,
  products,
}: {
  cardsPriceUsd: number;
  onClose: () => void;
  products: any[];
}) {
  const cart = useCart();
  const { address } = useAccount();
  const { writeContract, isPending, isSuccess, data: txHash } = useWriteContract();

  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"CARDS" | "ETH" | "USDC">("CARDS");

  // New: Fetch live ETH price
  const [ethPriceUsd, setEthPriceUsd] = useState(2950); // fallback ~ current market

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
          cache: "no-cache",
        });
        const data = await res.json();
        if (data.ethereum?.usd) {
          setEthPriceUsd(data.ethereum.usd);
        }
      } catch (err) {
        console.error("ETH price fetch failed:", err);
      }
    };

    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const totalBaseUsd = cart.items.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const shipping = 0;
  const totalUsd = totalBaseUsd + shipping;

  // Amounts based on selected currency
  const cardsAmount = Math.ceil(totalUsd / cardsPriceUsd);
  const cardsAmountWei = parseUnits(cardsAmount.toString(), CARDS_DECIMALS);

  const ethAmount = (totalUsd / ethPriceUsd).toFixed(6); // 6 decimals for display
  const ethAmountWei = parseEther(ethAmount);

  const usdcAmount = totalUsd.toFixed(2); // USDC = $1
  const usdcAmountWei = parseUnits(usdcAmount, 6);

  const handleProceedToShipping = () => {
    for (const item of cart.items) {
      const prod = products.find((p: any) => p.id === item.id);
      if (!prod || prod.stock < item.quantity) {
        alert(`Only ${prod?.stock || 0} "${item.name}" left!`);
        return;
      }
    }
    setShowForm(true);
  };

  const handlePay = () => {
    if (paymentCurrency === "CARDS") {
      writeContract({
        address: TOKEN_ADDRESS,
        abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
        functionName: "transfer",
        args: [RECEIVE_WALLET, cardsAmountWei],
      });
    } else if (paymentCurrency === "ETH") {
      writeContract({
        address: RECEIVE_WALLET,
        value: ethAmountWei,
      });
    } else if (paymentCurrency === "USDC") {
      writeContract({
        address: USDC_ADDRESS,
        abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
        functionName: "transfer",
        args: [RECEIVE_WALLET, usdcAmountWei],
      });
    }
  };

  useEffect(() => {
    if (isSuccess && txHash) {
      cart.items.forEach((item) => {
        runTransaction(ref(db, `products/${item.id}`), (current) => {
          if (!current || current.stock < item.quantity) return current;
          return { ...current, stock: current.stock - item.quantity };
        });
      });

      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          items: cart.items,
          paymentCurrency,
          amount: paymentCurrency === "CARDS" ? cardsAmount : paymentCurrency === "ETH" ? ethAmount : usdcAmount,
          totalUsd,
          shipping,
          txHash,
        }),
      });

      cart.clear();
      setShowForm(false);
      setShowSuccess(true);
    }
  }, [isSuccess, txHash]);

  // SUCCESS SCREEN (unchanged)
  if (showSuccess) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "linear-gradient(to bottom, #111, #000)", padding: "40px 20px", borderRadius: "32px", border: "4px solid #ffd700", textAlign: "center", maxWidth: "90%", boxShadow: "0 0 60px rgba(255,215,0,0.4)" }}>
          <div style={{ fontSize: "80px", color: "#00ff9d" }}>✓</div>
          <h2 style={{ color: "#ffd700", fontSize: "40px", fontWeight: "bold", margin: "20px 0" }}>THANK YOU!</h2>
          <p style={{ color: "#fff", fontSize: "20px", marginBottom: "30px", lineHeight: "1.6" }}>
            Your order is confirmed on Base<br />
            Cards ship in 24–48 hours
          </p>
          <button
            onClick={onClose}
            style={{
              background: "#00ff9d",
              color: "#000",
              padding: "16px 40px",
              borderRadius: "24px",
              fontWeight: "bold",
              fontSize: "24px",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(0,255,157,0.4)",
            }}
          >
            BACK TO STORE
          </button>
        </div>
      </div>
    );
  }

  // SHIPPING FORM — now with currency selector and live ETH price
  if (showForm) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
        <div
          style={{
            background: "#111",
            borderRadius: "24px",
            border: "4px solid #ffd700",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "30px 20px",
            boxShadow: "0 0 60px rgba(255,215,0,0.3)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button onClick={() => setShowForm(false)} style={{ alignSelf: "flex-end", fontSize: "36px", color: "#ffd700", background: "none", border: "none", cursor: "pointer", marginBottom: "10px" }}>
            ×
          </button>

          <h2 style={{ color: "#ffd700", fontSize: "36px", fontWeight: "bold", textAlign: "center", marginBottom: "30px" }}>SHIPPING ADDRESS</h2>

          <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          <input placeholder="Street Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={inputStyle} />
          </div>

          <input placeholder="ZIP Code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} style={inputStyle} />

          {/* Payment Currency Selector */}
          <div style={{ margin: "30px 0" }}>
            <p style={{ color: "#ffd700", fontSize: "24px", fontWeight: "bold", textAlign: "center" }}>Choose Payment</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={() => setPaymentCurrency("CARDS")}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  background: paymentCurrency === "CARDS" ? "#ffd700" : "#222",
                  color: paymentCurrency === "CARDS" ? "#000" : "#ffd700",
                  border: "2px solid #ffd700",
                }}
              >
                ✨ $CARDS → 10% OFF + Free Shipping<br />
                ≈ {cardsAmount.toLocaleString()} $CARDS
              </button>

              <button
                onClick={() => setPaymentCurrency("ETH")}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  background: paymentCurrency === "ETH" ? "#00ff9d" : "#222",
                  color: paymentCurrency === "ETH" ? "#000" : "#fff",
                  border: "2px solid #00ff9d",
                }}
              >
                ETH → Full Price<br />
                ≈ {ethAmount} ETH (live price)
              </button>

              <button
                onClick={() => setPaymentCurrency("USDC")}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  background: paymentCurrency === "USDC" ? "#00ff9d" : "#222",
                  color: paymentCurrency === "USDC" ? "#000" : "#fff",
                  border: "2px solid #00ff9d",
                }}
              >
                USDC → Full Price<br />
                {usdcAmount} USDC
              </button>
            </div>
          </div>

          <div style={{ background: "#000", padding: "20px", borderRadius: "16px", border: "2px solid #00ff9d", textAlign: "center", margin: "20px 0" }}>
            <p style={{ color: "#00ff9d", fontSize: "20px", fontWeight: "bold" }}>Shipping: FREE</p>
            <p style={{ color: "#00ff9d", fontSize: "28px", fontWeight: "bold", marginTop: "8px" }}>
              Total: ${totalUsd.toFixed(2)}
            </p>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: "#ccc", fontSize: "16px", margin: "20px 0" }}>
            <input
              type="checkbox"
              checked={isTermsAccepted}
              onChange={(e) => setIsTermsAccepted(e.target.checked)}
              style={{ width: "24px", height: "24px", accentColor: "#ffd700", flexShrink: 0, marginTop: "2px" }}
            />
            <span>
              I agree to the <a href="/terms" target="_blank" style={{ color: "#ffd700", textDecoration: "underline" }}>Terms of Service</a> and understand all sales are final.
            </span>
          </label>

          <button
            onClick={handlePay}
            disabled={isPending || !isTermsAccepted || !address}
            style={{
              width: "100%",
              padding: "20px",
              borderRadius: "24px",
              fontSize: "32px",
              fontWeight: "bold",
              cursor: isTermsAccepted && !isPending && address ? "pointer" : "not-allowed",
              background: isTermsAccepted && !isPending && address ? "linear-gradient(to right, #00ff9d, #00cc7a)" : "#444",
              color: "#000",
              border: "none",
              marginTop: "auto",
              boxShadow: isTermsAccepted && address ? "0 10px 30px rgba(0,255,157,0.5)" : "none",
            }}
          >
            {isPending ? "CONFIRMING..." : "CONFIRM & PAY"}
          </button>
        </div>
      </div>
    );
  }

  // MAIN CART VIEW (unchanged except minor styling)
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div
        style={{
          background: "linear-gradient(to bottom, #0a0a0a, #000)",
          borderRadius: "24px",
          border: "4px solid #ffd700",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "30px 20px",
          boxShadow: "0 0 80px rgba(255,215,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ textAlign: "center", color: "#ffd700", fontSize: "40px", fontWeight: "bold", marginBottom: "30px" }}>
          YOUR CART ({totalItems})
        </h2>

        {cart.items.map((item) => {
          const stock = products.find((p) => p.id === item.id)?.stock || 0;
          return (
            <div key={item.id} style={{ background: "#151515", borderRadius: "20px", padding: "20px", marginBottom: "20px", border: "2px solid #ffd70040" }}>
              <div style={{ color: "#ffd700", fontSize: "28px", fontWeight: "bold", marginBottom: "10px" }}>{item.name}</div>
              <div style={{ color: "#00ff9d", fontSize: "22px" }}>
                ${item.usd.toFixed(2)} × {item.quantity} = <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "28px" }}>${(item.usd * item.quantity).toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <select
                  value={item.quantity}
                  onChange={(e) => {
                    const q = Number(e.target.value);
                    if (q > stock) {
                      alert(`Only ${stock} left!`);
                      return;
                    }
                    cart.updateQuantity(item.id, q);
                  }}
                  style={{
                    background: "#222",
                    color: "#ffd700",
                    padding: "12px 20px",
                    borderRadius: "16px",
                    border: "3px solid #ffd700",
                    fontSize: "20px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {Array.from({ length: stock }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} style={{ background: "#000", color: "#ffd700" }}>{n}</option>
                  ))}
                </select>

                <button
                  onClick={() => cart.removeItem(item.id)}
                  style={{
                    color: "#ff4444",
                    fontSize: "40px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 16px",
                    borderRadius: "12px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#ff444430")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        <div style={{ borderTop: "3px solid #ffd70060", paddingTop: "30px", textAlign: "center" }}>
          <p style={{ color: "#aaa", fontSize: "22px", marginBottom: "10px" }}>
            Items Total: <span style={{ color: "#ffd700", fontWeight: "bold" }}>${totalBaseUsd.toFixed(2)}</span>
          </p>
          <p style={{ color: "#00ff9d", fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>Shipping: FREE</p>
          <p style={{ color: "#ffd700", fontSize: "48px", fontWeight: "bold" }}>TOTAL: ${totalUsd.toFixed(2)}</p>
          <p style={{ color: "#00ff9d", fontSize: "36px", fontWeight: "bold" }}>≈ {cardsAmount.toLocaleString()} $CARDS (best deal)</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "40px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "18px",
              background: "#333",
              color: "#fff",
              borderRadius: "20px",
              fontSize: "24px",
              fontWeight: "bold",
              cursor: "pointer",
              border: "2px solid #666",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#555")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#333")}
          >
            KEEP SHOPPING
          </button>

          <button
            onClick={handleProceedToShipping}
            disabled={!address}
            style={{
              padding: "18px",
              background: address ? "linear-gradient(to right, #00ff9d, #00cc7a)" : "#444",
              color: "#000",
              borderRadius: "20px",
              fontSize: "28px",
              fontWeight: "bold",
              cursor: address ? "pointer" : "not-allowed",
              border: "none",
              boxShadow: address ? "0 10px 30px rgba(0,255,157,0.5)" : "none",
            }}
          >
            PROCEED TO SHIPPING
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "18px",
  marginBottom: "18px",
  background: "#1a1a1a",
  border: "3px solid #ffd70060",
  borderRadius: "16px",
  color: "#fff",
  fontSize: "20px",
  outline: "none",
  transition: "border 0.3s",
} as const;
