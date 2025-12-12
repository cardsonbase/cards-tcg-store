// app/page.tsx 
"use client";

import ConnectWalletClient from "./components/ConnectWalletClient";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import Cart from "./components/Cart";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useCart } from "@/lib/cart";

export default function Home() {
  const [price, setPrice] = useState(0.00005);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "slabs" | "boosters">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const cart = useCart();
  const [showCart, setShowCart] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [treasuryEth, setTreasuryEth] = useState(0);
  const [showHowToBuy, setShowHowToBuy] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://api.dexscreener.com/latest/dex/pairs/base/0xd739228018b3d0b3222d34ce869e55891471549c", {
          cache: "no-cache",
          headers: { "Cache-Control": "no-cache" }
        });
        const data = await res.json();
        if (data.pairs && data.pairs.length > 0) {
          const newPrice = parseFloat(data.pairs[0].priceUsd);
          setPrice(newPrice);
        }
      } catch (err) {
        console.error("Price fetch failed:", err);
        setPrice(0.00000066593);
      }
    };

    fetchPrice();
    const id = setInterval(fetchPrice, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        const res = await fetch(
          `https://api.basescan.org/api?module=account&action=balance&address=0x4380603428C0c102B5110B4ED068ca9084835d24&tag=latest&apikey=`
        );
        const data = await res.json();

        if (data.status === "1") {
          setTreasuryEth(parseFloat(data.result) / 1e18);
          return;
        }
      } catch (e) {}

      try {
        const res = await fetch("https://mainnet.base.org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: ["0x4380603428C0c102B5110B4ED068ca9084835d24", "latest"],
            id: 1,
          }),
        });
        const data = await res.json();
        const balance = parseInt(data.result, 16);
        setTreasuryEth(balance / 1e18);
      } catch (err) {
        console.error("Both treasury fetches failed", err);
        setTreasuryEth(0);
      }
    };

    fetchTreasury();
    const id = setInterval(fetchTreasury, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const prodRef = ref(db, "products");
    return onValue(prodRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, p]: any) => ({
        id,
        name: p.name,
        usd: Number(p.usd),
        img: p.img || "/placeholder.png",
        stock: Number(p.stock) || 0,
        weightOz: Number(p.weightOz) || 8,
        category: p.category || "uncategorized",
      }));
      setProducts(list);
    });
  }, []);

  const visible = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .filter((p) => filter === "all" || (filter === "slabs" && p.weightOz <= 5) || (filter === "boosters" && p.weightOz > 5));

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Floating Gold Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            background: "#ffd700",
            color: "#000",
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            fontSize: "28px",
            fontWeight: "bold",
            boxShadow: "0 8px 30px rgba(255,215,0,0.5)",
            zIndex: 999,
            border: "none",
            cursor: "pointer",
          }}
        >
          {cartCount}
        </button>
      )}

      {/* Main Page */}
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000 0%, #111 100%)", color: "#fff", fontFamily: "Inter, sans-serif" }}>
        {/* Remove the header from here — it's in ClientLayout now */}

        {/* Fiat On-Ramp and Swap Section — Integrated, Centered, No Different BG */}
        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <p style={{ color: "#aaa", fontSize: "18px", marginBottom: "16px" }}>
            New to Base? Buy Base ETH with card in seconds:
          </p>
          <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            {/* Coinbase — Interactive Button */}
            <a 
              href="https://buy.coinbase.com/?destination=base" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                height: "48px",
                background: "rgba(255,215,0,0.1)",
                border: "2px solid #ffd700",
                borderRadius: "24px",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
            >
              <img
                src="/coinbase.png" 
                alt="Coinbase" 
                style={{ height: "32px", width: "auto" }} 
              />
            </a>
            
            {/* Ramp — Interactive Button, Updated for Base ETH */}
            <a 
              href="https://ramp.network/buy?defaultOptions=DEFAULT&swapAsset=BASE_ETH&hostAppName=Cards%20on%20Base&hostLogoUrl=https%3A%2F%2Fcards-on-base.vercel.app%2Flogo.png&finalUrl=https%3A%2F%2Fcards-on-base.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                height: "48px",
                background: "rgba(255,215,0,0.1)",
                border: "2px solid #ffd700",
                borderRadius: "24px",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
            >
              <img 
                src="/ramp.png" 
                alt="Ramp" 
                style={{ height: "32px", width: "auto" }} 
              />
            </a>
            
            {/* MoonPay — Interactive Button */}
            <a 
              href="https://buy.moonpay.com/?currencyCode=eth&chainId=8453" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                height: "48px",
                background: "rgba(255,215,0,0.1)",
                border: "2px solid #ffd700",
                borderRadius: "24px",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
            >
              <img 
                src="/moonpay.png" 
                alt="MoonPay" 
                style={{ height: "32px", width: "auto" }} 
              />
            </a>

            {/* Swap Widget Button — Next to Fiat Buttons */}
            <button
              onClick={() => setShowSwapModal(true)}
              style={{
                background: "#ffd700",
                color: "#000",
                padding: "16px 32px",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "22px",
                boxShadow: "0 4px 20px rgba(255,215,0,0.3)",
                transition: "transform 0.3s",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Trade $CARDS on Uniswap
            </button>
          </div>
          {/* How to Buy Button */}
          <button
            onClick={() => setShowHowToBuy(true)}
            style={{
              marginTop: "20px",
              background: "transparent",
              color: "#ffd700",
              padding: "8px 16px",
              border: "1px solid #ffd700",
              borderRadius: "12px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            How to Buy Guide
          </button>
        </div>

        {/* Category Dropdown — Centered for Better Flow */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "14px", width: "340px", background: "#111", border: "1px solid #444", borderRadius: "12px", color: "#fff", fontSize: "18px" }}
          >
            <option value="all">All Categories</option>
            <option value="avatar">Avatar:The Last Airbender</option>
            <option value="azurelane">Azure Lane</option>
            <option value="digimon">Digimon</option>
            <option value="disneylorcana">Disney Lorcana</option>
            <option value="magic">Magic the Gathering</option>
            <option value="mlb">MLB</option>
            <option value="nba">NBA</option>
            <option value="nfl">NFL</option>
            <option value="onepiece">One Piece</option>
            <option value="pokemon">Pokémon</option>
            <option value="riftbound">Riftbound:League Of Legends</option>
            <option value="starwars">Star Wars</option>
            <option value="yugioh">Yu-GI-Oh!</option>
            {/* Add more here as you add categories in Firebase */}
          </select>
        </div>

        <div style={{ maxWidth: "1200px", margin: "0 auto 50px", display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
          {/* SEARCH BAR — BACK AND WORKING */}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "14px", width: "340px", background: "#111", border: "1px solid #444", borderRadius: "12px", color: "#fff" }}
          />

          {/* TABS — FIXED LABELS */}
          <div style={{ display: "flex", gap: "12px" }}>
            {([
              { key: "all", label: "All" },
              { key: "slabs", label: "Slabs/Singles/Packs" },
              { key: "boosters", label: "Boosters" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "12px 24px",
                  background: filter === key ? "#ffd700" : "#111",
                  color: filter === key ? "#000" : "#ffd700",
                  border: "1px solid #ffd700",
                  borderRadius: "12px",
                  fontWeight: "bold",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px 140px", display: "grid", gap: "40px", gridTemplateColumns: "repeat(auto-fit, 340px)", justifyContent: "center" }}>
          {visible.map((p) => {
            const currentInCart = cart.items.find((i) => i.id === p.id)?.quantity || 0;
            const canAddMore = currentInCart < p.stock;

            return (
              <div
                key={p.id}
                style={{
                  background: "linear-gradient(145deg, #111, #000)",
                  border: "3px solid #ffd700",
                  borderRadius: "24px",
                  padding: "24px",
                  textAlign: "center",
                  boxShadow: "0 15px 40px rgba(255,215,0,0.3)",
                  transition: "transform 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-8px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Image src={p.img} alt={p.name} width={400} height={560} style={{ borderRadius: "16px", width: "100%", height: "auto" }} />
                <h3 style={{ margin: "20px 0 12px", color: "#ffd700", fontSize: "24px" }}>{p.name}</h3>

                <p style={{ fontSize: "32px", fontWeight: "bold", color: "#00ff9d", margin: "10px 0" }}>
                  {Math.ceil(p.usd / price).toLocaleString()} $CARDS
                </p>
                <p style={{ color: "#888", fontSize: "16px", marginBottom: "20px" }}>
                  ${p.usd.toFixed(2)} + shipping
                </p>

                {p.stock > 0 ? (
                  <div>
                    <button
                      onClick={() => {
                        if (!canAddMore) {
                          alert("No more stock!");
                          return;
                        }
                        cart.addItem({ id: p.id, name: p.name, usd: p.usd, weightOz: p.weightOz }, 1);
                      }}
                      style={{
                        background: canAddMore ? "#ffd700" : "#444",
                        color: "black",
                        padding: "18px",
                        width: "100%",
                        borderRadius: "16px",
                        fontWeight: "bold",
                        fontSize: "20px",
                        marginBottom: "12px",
                      }}
                    >
                      {currentInCart > 0 ? `Add Another (${currentInCart} in cart)` : "Add to Cart"}
                    </button>

                  </div>
                ) : (
                  <div style={{ height: "70px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "20px" }}>
                    Out of Stock
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Powered by Base — Bottom of Page */}
        <footer style={{ textAlign: "center", padding: "20px 0", borderTop: "1px solid #333" }}>
          <a
            href="https://base.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#aaa",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            Powered by
            <img 
              src="/base.jpg" 
              alt="Base" 
              style={{ height: "24px", width: "auto" }} 
            />
          </a>
        </footer>
      </div>

      {/* CART MODAL — appears on top */}
      {showCart && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowCart(false)}>
          <div
            style={{
              background: "#111",
              border: "3px solid #ffd700",
              borderRadius: "24px",
              padding: "40px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Cart
              cardsPriceUsd={price}
              onClose={() => setShowCart(false)}
              products={products}
            />
          </div>
        </div>
      )}

      {/* SWAP MODAL — Uniswap Widget */}
      {showSwapModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowSwapModal(false)}>
          <div
            style={{
              background: "#111",
              border: "3px solid #ffd700",
              borderRadius: "24px",
              padding: "40px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src="https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d&chain=base"
              height="660"
              width="100%"
              style={{
                border: "0",
                borderRadius: "16px",
              }}
            />
          </div>
        </div>
      )}

      {/* HOW TO BUY MODAL */}
      {showHowToBuy && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowHowToBuy(false)}>
          <div
            style={{
              background: "#111",
              border: "3px solid #ffd700",
              borderRadius: "24px",
              padding: "40px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ textAlign: "center", color: "#ffd700", marginBottom: "20px" }}>How to Buy on $CARDS TCG Store</h2>
            <ol style={{ listStyleType: "decimal", paddingLeft: "20px", fontSize: "18px", lineHeight: "1.6" }}>
              <li>Connect your wallet using the button in the top right corner.</li>
              <li>If you need Base ETH, click one of the "Buy Base ETH" buttons (Coinbase, Ramp, or MoonPay) to purchase with your card. The ETH will arrive directly on Base chain.</li>
              <li>Swap your Base ETH for $CARDS using the "Trade $CARDS on Uniswap" button. The widget is pre-set to Base.</li>
              <li>Browse categories or search for TCG items, then click "Add to Cart" on your favorites.</li>
              <li>Click the floating gold cart button (bottom right) to review your items, enter shipping details, and complete the on-chain checkout with $CARDS.</li>
            </ol>
            {/* SHIPPING & SUPPORT DISCLAIMER — FINAL, SCAM-PROOF VERSION */}
<div style={{ 
  textAlign: "center", 
  padding: "40px 20px 20px", 
  color: "#888", 
  fontSize: "14px", 
  maxWidth: "800px",
  margin: "0 auto",
  lineHeight: "1.6"
}}>
  <p style={{ margin: "10px 0" }}>
    Currently ships only within the United States via USPS with tracking (3–10 business days). International shipping coming soon.
  </p>
  <p style={{ margin: "10px 0" }}>
    Lost or damaged in transit? Send us a photo of the damage + your transaction hash and we’ll reship or refund within 24 hours.
  </p>
  <p style={{ margin: "16px 0 8px 0", fontWeight: "600", color: "#ffd700" }}>
    Need help?
  </p>
  <p style={{ margin: "8px 0" }}>
    DM → <a href="https://x.com/cardsonbaseHQ" target="_blank" style={{ color: "#ffd700", textDecoration: "underline" }}>@cardsonbaseHQ</a>
    <br />
    Email → <a href="mailto:cardsonbasehq@gmail.com" style={{ color: "#ffd700", textDecoration: "underline" }}>cardsonbasehq@gmail.com</a>
  </p>
  <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#666" }}>
    We ship thousands of cards. We know what we’re doing. You’re in good hands.
  </p>
</div>
            <button
              onClick={() => setShowHowToBuy(false)}
              style={{
                display: "block",
                margin: "20px auto 0",
                background: "#ffd700",
                color: "#000",
                padding: "12px 24px",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}