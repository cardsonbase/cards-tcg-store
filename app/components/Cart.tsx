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
  const [form, setForm] = useState({ name: "", email: "", address: "", city: "", state: "", zip: "" });
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const totalBaseUsd = cart.items.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);

  const shipping = 0; // FREE SHIPPING
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

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center">
        <div className="bg-gradient-to-br from-[#111] to-black p-12 rounded-3xl border-4 border-yellow-400 w-full max-w-lg shadow-2xl relative">
          <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-yellow-400 text-4xl hover:text-yellow-300">
            ×
          </button>
          <h2 className="text-yellow-400 text-5xl font-black text-center mb-10">SHIPPING ADDRESS</h2>

          <label className="text-yellow-400 text-xl font-bold mb-2 block">Name</label>
          <input
            placeholder="Enter full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full p-5 mb-5 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
          />

          <label className="text-yellow-400 text-xl font-bold mb-2 block">Email (for receipt)</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-5 mb-5 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
          />

          <label className="text-yellow-400 text-xl font-bold mb-2 block">Street Address</label>
          <input
            placeholder="Enter street address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full p-5 mb-5 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
          />

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-yellow-400 text-xl font-bold mb-2 block">City</label>
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-5 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
              />
            </div>
            <div>
              <label className="text-yellow-400 text-xl font-bold mb-2 block">State (e.g., CA)</label>
              <input
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full p-5 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
              />
            </div>
          </div>

          <label className="text-yellow-400 text-xl font-bold mb-2 block">ZIP Code</label>
          <input
            placeholder="ZIP (5 digits)"
            value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
            className="w-full p-5 mb-8 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
          />

          <div className="text-center mb-8 bg-black/40 rounded-2xl p-6 border border-green-400/50">
            <p className="text-green-400 text-2xl font-bold">Shipping: FREE</p>
            <p className="text-green-400 text-3xl font-black mt-3">
              Total: ${totalUsd.toFixed(2)} ≈ {amount.toLocaleString()} $CARDS
            </p>
          </div>

          <label className="flex items-start gap-4 text-lg text-gray-200">
            <input
              type="checkbox"
              checked={isTermsAccepted}
              onChange={(e) => setIsTermsAccepted(e.target.checked)}
              className="mt-1 h-6 w-6 rounded border-yellow-600 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-white">
                Terms of Service
              </a>{" "}
              and understand all sales are final.
            </span>
          </label>

                    <button
            onClick={handlePay}
            disabled={isPending || !isTermsAccepted || !address}
            className={`w-full mt-8 py-8 rounded-3xl font-black text-5xl shadow-2xl transition-all duration-200 active:scale-98 ${
              isTermsAccepted && !isPending && address
                ? "bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 active:from-green-500 active:to-green-600 text-black cursor-pointer"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isPending ? "CONFIRMING ON BASE..." : "CONFIRM & PAY"}
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center">
        <div className="bg-gradient-to-br from-[#111] to-black p-16 rounded-3xl border-4 border-yellow-400 text-center shadow-2xl max-w-2xl">
          <div className="text-green-400 text-9xl mb-8">Purchase Complete</div>
          <h2 className="text-yellow-400 text-7xl font-black mb-8">THANK YOU!</h2>
          <p className="text-white text-3xl mb-12">
            Your order is confirmed on Base<br />
            Cards ship in 24–48 hours
          </p>
          <button
            onClick={onClose}
            className="bg-green-400 hover:bg-green-300 text-black px-24 py-7 rounded-2xl font-black text-4xl shadow-2xl transition cursor-pointer"  // Added cursor-pointer
          >
            BACK TO STORE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-[#0a0a0a] to-black rounded-3xl border-4 border-yellow-400 w-full max-w-2xl max-h-[92vh] overflow-y-auto p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center text-yellow-400 text-6xl font-black mb-12 tracking-wider">
          YOUR CART ({totalItems})
        </h2>

        {cart.items.map((item) => {
          const stock = products.find((p) => p.id === item.id)?.stock || 0;
          return (
            <div key={item.id} className="bg-[#151515] rounded-2xl p-8 mb-8 border border-yellow-500/40 shadow-2xl">
              <div className="text-yellow-400 text-3xl font-bold mb-4">{item.name}</div>
              <div className="text-green-400 text-2xl">
                ${item.usd.toFixed(2)} × {item.quantity} ={" "}
                <span className="text-yellow-300 font-black text-3xl">
                  ${(item.usd * item.quantity).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-8">
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
                  className="bg-[#222] text-yellow-400 px-8 py-4 rounded-2xl border-4 border-yellow-400 font-bold text-xl"
                >
                  {Array.from({ length: stock }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-black text-yellow-400">
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => cart.removeItem(item.id)}
                  className="text-red-500 hover:text-red-400 text-5xl font-black cursor-pointer"  // Added cursor-pointer
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        <div className="border-t-4 border-yellow-500/60 pt-10 text-center">
          <p className="text-gray-400 text-2xl mb-4">
            Items Total: <span className="text-yellow-400 font-bold">${totalBaseUsd.toFixed(2)}</span>
          </p>
          <p className="text-green-400 text-3xl font-bold mb-8">
            Shipping: FREE
          </p>
          <p className="text-yellow-400 text-6xl font-black mb-4">TOTAL: ${totalUsd.toFixed(2)}</p>
          <p className="text-green-400 text-4xl font-black">≈ {amount.toLocaleString()} $CARDS</p>
        </div>

        <div clas<div className="grid grid-cols-2 gap-8 mt-16">
         <div className="grid grid-cols-2 gap-8 mt-16">
          <button
            onClick={onClose}
            className="py-7 bg-gray-800 hover:bg-gray-600 active:bg-gray-700 text-white rounded-2xl font-black text-3xl shadow-2xl transition-all duration-200 border-2 border-gray-600 hover:border-gray-400 active:scale-95 cursor-pointer"
          >
            KEEP SHOPPING
          </button>
          <button
            onClick={handleProceedToShipping}
            disabled={!address}
            className="py-7 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 active:from-green-600 active:to-green-500 text-black rounded-2xl font-black text-4xl shadow-2xl transition-all duration-200 border-2 border-green-600/50 hover:border-green-500 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            PROCEED TO SHIPPING
          </button>
        </div>
      </div>
    </div>
  );
}
