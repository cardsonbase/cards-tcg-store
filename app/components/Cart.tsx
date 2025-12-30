"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { db } from "@/lib/firebase";
import { ref, runTransaction } from "firebase/database";
import { useCart } from "@/lib/cart";

const TOKEN_ADDRESS = "0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d";
const RECEIVE_WALLET = "0x862fa56aA3477ED1f9AEe5D712B816027b263f2f";
const DECIMALS = 9;

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

  const totalBaseUsd = cart.items.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const shipping = 0;
  const totalUsd = totalBaseUsd + shipping;
  const amount = Math.ceil(totalUsd / cardsPriceUsd);
  const amountWei = parseUnits(amount.toString(), DECIMALS);

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
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
      functionName: "transfer",
      args: [RECEIVE_WALLET, amountWei],
    });
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
          amount,
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

  // SUCCESS SCREEN
  if (showSuccess) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "linear-gradient(to bottom, #111, #000)", padding: "60px", borderRadius: "32px", border: "4px solid #ffd700", textAlign: "center", maxWidth: "600px", boxShadow: "0 0 60px rgba(255,215,0,0.4)" }}>
          <div style={{ fontSize: "120px", color: "#00ff9d" }}>✓</div>
          <h2 style={{ color: "#ffd700", fontSize: "60px", fontWeight: "bold", margin: "20px 0" }}>THANK YOU!</h2>
          <p style={{ color: "#fff", fontSize: "28px", marginBottom: "40px" }}>
            Your order is confirmed on Base<br />
            Cards ship in 24–48 hours
          </p>
          <button
            onClick={onClose}
            style={{
              background: "#00ff9d",
              color: "#000",
              padding: "20px 60px",
              borderRadius: "24px",
              fontWeight: "bold",
              fontSize: "36px",
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

  // SHIPPING FORM
  if (showForm) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "#111", padding: "50px", borderRadius: "32px", border: "4px solid #ffd700", width: "90%", maxWidth: "600px", boxShadow: "0 0 60px rgba(255,215,0,0.3)" }}>
          <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: "20px", right: "30px", fontSize: "40px", color: "#ffd700", background: "none", border: "none", cursor: "pointer" }}>
            ×
          </button>

          <h2 style={{ color: "#ffd700", fontSize: "48px", fontWeight: "bold", textAlign: "center", marginBottom: "40px" }}>SHIPPING ADDRESS</h2>

          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email (for receipt & tracking)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Street Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            <input placeholder="State (e.g. CA)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={inputStyle} />
          </div>

          <input placeholder="ZIP Code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} style={inputStyle} />

          <div style={{ background: "#000", padding: "30px", borderRadius: "20px", border: "2px solid #00ff9d", textAlign: "center", margin: "30px 0" }}>
            <p style={{ color: "#00ff9d", fontSize: "28px", fontWeight: "bold" }}>Shipping: FREE</p>
            <p style={{ color: "#00ff9d", fontSize: "36px", fontWeight: "bold", marginTop: "10px" }}>
              Total: ${totalUsd.toFixed(2)} ≈ {amount.toLocaleString()} $CARDS
            </p>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: "16px", color: "#ccc", fontSize: "18px", marginBottom: "30px" }}>
            <input
              type="checkbox"
              checked={isTermsAccepted}
              onChange={(e) => setIsTermsAccepted(e.target.checked)}
              style={{ width: "28px", height: "28px", marginTop: "4px", accentColor: "#ffd700" }}
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
              padding: "28px",
              borderRadius: "32px",
              fontSize: "48px",
              fontWeight: "bold",
              cursor: isTermsAccepted && !isPending && address ? "pointer" : "not-allowed",
              background: isTermsAccepted && !isPending && address ? "linear-gradient(to right, #00ff9d, #00cc7a)" : "#444",
              color: "#000",
              border: "none",
              boxShadow: isTermsAccepted && address ? "0 15px 40px rgba(0,255,157,0.5)" : "none",
              transition: "all 0.3s",
            }}
          >
            {isPending ? "CONFIRMING ON BASE..." : "CONFIRM & PAY"}
          </button>
        </div>
      </div>
    );
  }

  // MAIN CART VIEW
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div
        style={{
          background: "linear-gradient(to bottom, #0a0a0a, #000)",
          borderRadius: "32px",
          border: "4px solid #ffd700",
          width: "90%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "40px",
          boxShadow: "0 0 80px rgba(255,215,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ textAlign: "center", color: "#ffd700", fontSize: "56px", fontWeight: "bold", marginBottom: "40px" }}>
          YOUR CART ({totalItems})
        </h2>

        {cart.items.map((item) => {
          const stock = products.find((p) => p.id === item.id)?.stock || 0;
          return (
            <div key={item.id} style={{ background: "#151515", borderRadius: "24px", padding: "30px", marginBottom: "30px", border: "2px solid #ffd70040", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ color: "#ffd700", fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>{item.name}</div>
              <div style={{ color: "#00ff9d", fontSize: "28px" }}>
                ${item.usd.toFixed(2)} × {item.quantity} ={" "}
                <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "36px" }}>
                  ${(item.usd * item.quantity).toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px" }}>
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
                    padding: "16px 24px",
                    borderRadius: "20px",
                    border: "4px solid #ffd700",
                    fontSize: "24px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {Array.from({ length: stock }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} style={{ background: "#000", color: "#ffd700" }}>
                      {n}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => cart.removeItem(item.id)}
                  style={{
                    color: "#ff4444",
                    fontSize: "48px",
                    fontWeight: "bold",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    transition: "all 0.3s",
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

        <div style={{ borderTop: "4px solid #ffd70060", paddingTop: "40px", textAlign: "center" }}>
          <p style={{ color: "#aaa", fontSize: "28px", marginBottom: "16px" }}>
            Items Total: <span style={{ color: "#ffd700", fontWeight: "bold" }}>${totalBaseUsd.toFixed(2)}</span>
          </p>
          <p style={{ color: "#00ff9d", fontSize: "36px", fontWeight: "bold", marginBottom: "30px" }}>
            Shipping: FREE
          </p>
          <p style={{ color: "#ffd700", fontSize: "64px", fontWeight: "bold", marginBottom: "10px" }}>
            TOTAL: ${totalUsd.toFixed(2)}
          </p>
          <p style={{ color: "#00ff9d", fontSize: "48px", fontWeight: "bold" }}>
            ≈ {amount.toLocaleString()} $CARDS
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "50px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "24px",
              background: "#333",
              color: "#fff",
              borderRadius: "24px",
              fontSize: "32px",
              fontWeight: "bold",
              cursor: "pointer",
              border: "2px solid #666",
              transition: "all 0.3s",
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
              padding: "24px",
              background: address ? "linear-gradient(to right, #00ff9d, #00cc7a)" : "#444",
              color: "#000",
              borderRadius: "24px",
              fontSize: "36px",
              fontWeight: "bold",
              cursor: address ? "pointer" : "not-allowed",
              border: "none",
              boxShadow: address ? "0 15px 40px rgba(0,255,157,0.5)" : "none",
              transition: "all 0.3s",
            }}
          >
            PROCEED TO SHIPPING
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable input style
const inputStyle = {
  width: "100%",
  padding: "24px",
  marginBottom: "24px",
  background: "#1a1a1a",
  border: "3px solid #ffd70060",
  borderRadius: "20px",
  color: "#fff",
  fontSize: "24px",
  outline: "none",
  transition: "all 0.3s",
} as const;

// Add hover/focus effects via JS (optional, but nice)
if (typeof window !== "undefined") {
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", (e: any) => {
      e.target.style.border = "3px solid #ffd700";
      e.target.style.boxShadow = "0 0 20px rgba(255,215,0,0.4)";
    });
    input.addEventListener("blur", (e: any) => {
      e.target.style.border = "3px solid #ffd70060";
      e.target.style.boxShadow = "none";
    });
  });
}
