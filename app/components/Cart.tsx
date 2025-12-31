"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useSendTransaction } from "wagmi";
import { parseUnits, parseEther } from "viem";
import { db } from "@/lib/firebase";
import { ref, runTransaction } from "firebase/database";
import { useCart } from "@/lib/cart";

const TOKEN_ADDRESS = "0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
const RECEIVE_WALLET = "0x862fa56aA3477ED1f9AEe5D712B816027b263f2f";
const CARDS_DECIMALS = 9;
const USDC_DECIMALS = 6;
const ORIGIN_ZIP = "71111";

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
  const { writeContract, isPending: contractPending, isSuccess: contractSuccess, data: txHash } = useWriteContract();
  const { sendTransaction, isPending: sendPending } = useSendTransaction();

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
  const [paymentMethod, setPaymentMethod] = useState<'$CARDS' | 'ETH' | 'USDC'>('$CARDS');
  const [ethPrice, setEthPrice] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const totalBaseUsd = cart.items.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const totalWeightOz = cart.items.reduce((s, i) => s + i.weightOz * i.quantity, 0);
  const isCards = paymentMethod === '$CARDS';
  const discountedUsd = isCards ? totalBaseUsd * 0.9 : totalBaseUsd;
  const totalUsd = discountedUsd + shipping;
  const amount = isCards ? Math.ceil(totalUsd / cardsPriceUsd) : (paymentMethod === 'ETH' ? totalUsd / ethPrice : totalUsd);
  const amountWei = isCards ? parseUnits(amount.toString(), CARDS_DECIMALS) : (paymentMethod === 'ETH' ? parseEther(amount.toFixed(18)) : parseUnits(amount.toString(), USDC_DECIMALS));

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const data = await res.json();
        setEthPrice(data.ethereum.usd);
      } catch (err) {
        console.error("ETH price fetch failed", err);
        setEthPrice(2000); // Fallback
      }
    };
    fetchEthPrice();
  }, []);

  const calculateZone = (destZip: string) => {
    const firstDigit = destZip[0];
    const zipFirstDigitToZoneFrom7 = {
      '0': 5, // Northeast
      '1': 5, // Mid-Atlantic
      '2': 4, // Southeast
      '3': 3, // South
      '4': 4, // Midwest
      '5': 5, // Central
      '6': 4, // Southwest
      '7': 1, // Local (AR, LA, OK, TX)
      '8': 4, // West
      '9': 6, // Pacific
    };
    return zipFirstDigitToZoneFrom7[firstDigit as keyof typeof zipFirstDigitToZoneFrom7] || 8; // Default high zone
  };

  const calculateShipping = (zone: number, weightOz: number) => {
    const weightBracket = Math.min(Math.ceil(weightOz / 4) * 4, 16); // Bracket in 4oz increments, cap at 16oz
    const rates = {
      4: [7.20, 7.25, 7.35, 7.50, 7.80, 7.90, 8.10, 8.40, 8.40],
      8: [7.50, 7.70, 7.85, 8.00, 8.35, 8.55, 8.80, 9.25, 9.25],
      12: [8.55, 8.85, 9.05, 9.30, 9.75, 10.00, 10.45, 11.10, 11.10],
      16: [9.10, 9.45, 9.75, 10.10, 10.65, 11.00, 11.55, 12.45, 12.45],
    };
    const bracketRates = rates[weightBracket as keyof typeof rates] || rates[16];
    return bracketRates[zone - 1] || 12.45; // Default max
  };

  useEffect(() => {
    if (!isCards && form.zip.length === 5) {
      const zone = calculateZone(form.zip);
      const shipCost = calculateShipping(zone, totalWeightOz);
      setShipping(shipCost);
    } else {
      setShipping(0);
    }
  }, [form.zip, paymentMethod, totalWeightOz, isCards]);

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
    if (paymentMethod === 'ETH') {
      sendTransaction({
        to: RECEIVE_WALLET as `0x${string}`,
        value: amountWei,
      });
    } else {
      const tokenAddr = paymentMethod === '$CARDS' ? TOKEN_ADDRESS : USDC_ADDRESS;
      writeContract({
        address: tokenAddr as `0x${string}`,
        abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }],
        functionName: "transfer",
        args: [RECEIVE_WALLET, amountWei],
      });
    }
  };

  useEffect(() => {
    if ((contractSuccess || sendPending === false && txHash) && txHash) { // Handle both
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
          paymentMethod,
        }),
      });

      cart.clear();
      setShowForm(false);
      setShowSuccess(true);
    }
  }, [contractSuccess, sendPending, txHash]);

  // SUCCESS SCREEN
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

  // SHIPPING FORM — Now fully scrollable and fits on mobile
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

          <div style={{ background: "#000", padding: "20px", borderRadius: "16px", border: "2px solid #00ff9d", textAlign: "center", margin: "20px 0" }}>
            <p style={{ color: "#00ff9d", fontSize: "20px", fontWeight: "bold" }}>Shipping: ${shipping.toFixed(2)}</p>
            <p style={{ color: "#00ff9d", fontSize: "28px", fontWeight: "bold", marginTop: "8px" }}>
              Total: ${totalUsd.toFixed(2)} ≈ {amount.toLocaleString()} {paymentMethod}
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
            disabled={contractPending || sendPending || !isTermsAccepted || !address || !form.zip || form.zip.length !== 5}
            style={{
              width: "100%",
              padding: "20px",
              borderRadius: "24px",
              fontSize: "32px",
              fontWeight: "bold",
              cursor: isTermsAccepted && address && form.zip.length === 5 ? "pointer" : "not-allowed",
              background: isTermsAccepted && address && form.zip.length === 5 ? "linear-gradient(to right, #00ff9d, #00cc7a)" : "#444",
              color: "#000",
              border: "none",
              marginTop: "auto", // Pushes button to bottom if space
              boxShadow: isTermsAccepted && address ? "0 10px 30px rgba(0,255,157,0.5)" : "none",
            }}
          >
            {(contractPending || sendPending) ? "CONFIRMING..." : "CONFIRM & PAY"}
          </button>
        </div>
      </div>
    );
  }

  // MAIN CART VIEW — Now properly scrollable
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
          <p style={{ color: "#00ff9d", fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>Shipping: {isCards ? 'FREE' : 'Calculated at checkout'}</p>
          <p style={{ color: "#ffd700", fontSize: "48px", fontWeight: "bold" }}>TOTAL: ${discountedUsd.toFixed(2)}</p>
          <p style={{ color: "#00ff9d", fontSize: "36px", fontWeight: "bold" }}>≈ {amount.toLocaleString()} {paymentMethod}</p>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ color: "#aaa", fontSize: "18px", marginBottom: "10px" }}>Payment Method:</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button
              onClick={() => setPaymentMethod('$CARDS')}
              style={{
                padding: "12px 24px",
                background: paymentMethod === '$CARDS' ? "#ffd700" : "#111",
                color: paymentMethod === '$CARDS' ? "#000" : "#ffd700",
                border: "1px solid #ffd700",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              $CARDS (10% off + free ship)
            </button>
            <button
              onClick={() => setPaymentMethod('ETH')}
              style={{
                padding: "12px 24px",
                background: paymentMethod === 'ETH' ? "#ffd700" : "#111",
                color: paymentMethod === 'ETH' ? "#000" : "#ffd700",
                border: "1px solid #ffd700",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              ETH
            </button>
            <button
              onClick={() => setPaymentMethod('USDC')}
              style={{
                padding: "12px 24px",
                background: paymentMethod === 'USDC' ? "#ffd700" : "#111",
                color: paymentMethod === 'USDC' ? "#000" : "#ffd700",
                border: "1px solid #ffd700",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              USDC
            </button>
          </div>
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
