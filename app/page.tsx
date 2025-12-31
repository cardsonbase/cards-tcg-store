"use client";

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
  WalletDropdownLink,
  WalletModal,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
  Name,
  Identity,
  Address,
} from '@coinbase/onchainkit/identity';
import Image from "next/image";
import { useEffect, useState } from "react";
import Cart from "./components/Cart";
import { db } from "@/lib/firebase";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { ref, onValue } from "firebase/database";
import { useCart } from "@/lib/cart";
import dynamic from "next/dynamic";
import { useAccount, useDisconnect } from 'wagmi';  // Add useDisconnect
import { FundButton } from '@coinbase/onchainkit/fund';

export default function Home() {
  const [price, setPrice] = useState(0.00005);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "slabs" | "boosters">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const cart = useCart();
  const [showCart, setShowCart] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [treasuryEth, setTreasuryEth] = useState(0);
  const [showHowToBuy, setShowHowToBuy] = useState(false);
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
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

    // 1. Call setFrameReady IMMEDIATELY when the page loads (hides splash fastest)
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  // 2. Your existing Firebase products listener (updated with extra safety call)
  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === "undefined") return;

    const prodRef = ref(db, "products");

    const unsubscribe = onValue(prodRef, (snap) => {
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

      // Extra safety: call again after products load
      if (!isFrameReady) {
        setFrameReady();
      }
    });

    return () => unsubscribe();
  }, [isFrameReady, setFrameReady]);

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
          <header className="header" style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
            {/* LOGO — PERFECT, NO STRETCH, CRISP */}
            <div className="flex items-center h-20">
              <img
                src="/logo.png"
                alt="$CARDS"
                className="h-full w-auto max-w-none"
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* CENTER: TITLE + PRICE + TREASURY — NOW PERFECTLY ALIGNED WITH THE REST OF THE SITE */}
           <div className="header-center" style={{ textAlign: "center", flex: 1, paddingRight: "50px" }}>
           <h1 style={{ 
           fontSize: "48px", 
           fontWeight: "bold", 
           background: "linear-gradient(90deg, #ffd700, #ffed4e)", 
           WebkitBackgroundClip: "text", 
           WebkitTextFillColor: "transparent",
           margin: "0 0 24px 0",
           fontFamily: "'Cinzel', serif"
           }}>
           CARDS COLLECTIBLES
          </h1>
    <p style={{ color: "#aaa", fontSize: "16px", margin: "4px 0" }}>Live $CARDS Price</p>
    <p style={{ 
      fontSize: "32px", 
      fontWeight: "bold", 
      background: "linear-gradient(90deg, #ffd700, #00ff9d)", 
      WebkitBackgroundClip: "text", 
      WebkitTextFillColor: "transparent",
      animation: "glow 2s ease-in-out infinite alternate",
      textShadow: "0 0 15px rgba(255,215,0,0.4)"
    }}>
      ${price.toFixed(7)}
    </p>
    <p style={{ color: "#aaa", fontSize: "16px", margin: "4px 0" }}>Live Treasury Balance</p>
    <p style={{ 
      fontSize: "28px", 
      fontWeight: "bold", 
      background: "linear-gradient(90deg, #ffd700, #00ff9d)", 
      WebkitBackgroundClip: "text", 
      WebkitTextFillColor: "transparent",
      animation: "glow 2s ease-in-out infinite alternate",
      textShadow: "0 0 15px rgba(255,215,0,0.4)"
    }}>
      {treasuryEth.toFixed(4)} ETH
    </p>
  </div>

            {/* X LINK + DEXTOOLS + FARCASTER + BASESCAN + WALLET */}
            <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "20px" }}>

              <a
                href="https://cardsonbase.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/logo.png"
                  alt="Website"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>

              <a
                href="https://t.me/CARDSCollectibles"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/telegram.png"
                  alt="telegram"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>
              
              <a
                href="https://x.com/cardsonbaseHQ"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffd700">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 16.123h1.764L6.11 5.127H4.246z" />
                </svg>
              </a>

              <a
                href="https://www.dextools.io/app/en/token/cardsonbase?t=1765004739445"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/dextools.png"
                  alt="Dextools"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>

              <a
                href="https://dexscreener.com/base/0xd739228018b3d0b3222d34ce869e55891471549c"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/dexscreener.png"
                  alt="Dexscreener"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>

              <a
                href="https://farcaster.xyz/cardsonbase"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/farcaster.png"
                  alt="Farcaster"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>

              <a
                href="https://basescan.org/token/0x65f3d0b7a1071d4f9aad85957d8986f5cff9ab3d"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  background: "rgba(255,215,0,0.1)",
                  border: "2px solid #ffd700",
                  borderRadius: "50%",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.1)")}
              >
                <img
                  src="/basescan.svg"
                  alt="Basescan"
                  style={{ width: "32px", height: "32px", objectFit: "contain" }}
                />
              </a>

              <Wallet>
                <ConnectWallet
                  render={({ onClick, status, isLoading }) => (
                    <button
                      onClick={() => {
                        if (status === 'disconnected') {
                          onClick(); // Opens the connection modal
                        } else {
                          setIsDropdownOpen((prev) => !prev); // Toggle dropdown when connected
                        }
                      }}
                      disabled={isLoading}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'linear-gradient(to right, #ffd700, #ffed4e)',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        padding: '12px 24px',
                        borderRadius: '9999px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        border: '3px solid #000',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(255,215,0,0.6)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-black" />
                        <span className="font-bold drop-shadow-md">
                          {status === 'disconnected' ? 'Connect Wallet' : <Name />}
                        </span>
                      </div>
                    </button>
                  )}
                />

                {/* Custom Dropdown – properly conditional */}
                {isConnected && isDropdownOpen && (
                  <>
                    {/* Invisible overlay – only when dropdown is open */}
                    <div
                      style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 40,
                        background: "transparent",
                      }}
                      onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Dropdown panel */}
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "16px",
                        width: "320px",
                        background: "linear-gradient(to bottom, #111, #000)",
                        borderRadius: "16px",
                        border: "2px solid #333",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                        overflow: "hidden",
                        zIndex: 50,
                      }}
                    >
                      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #333" }}>
                        <Identity hasCopyAddressOnClick>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <Avatar className="h-12 w-12 ring-4 ring-[#ffd700]" />
                            <div>
                              <Name className="text-xl font-bold text-[#ffd700]" />
                              <Address className="text-sm text-gray-400" />
                            </div>
                          </div>
                        </Identity>
                      </div>

                      <div style={{ padding: "8px 0" }}>
                        <a
                          href="https://keys.coinbase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            padding: "12px 24px",
                            color: "#ffd700",
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#222";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#ffd700";
                          }}
                        >
                          Smart Wallet
                        </a>
                        <a
                          href="https://portfolio.coinbase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            padding: "12px 24px",
                            color: "#ffd700",
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#222";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#ffd700";
                          }}
                        >
                          Portfolio
                        </a>
                      </div>

                      <div style={{ borderTop: "1px solid #333", padding: "16px 24px" }}>
                        <button
                          onClick={() => {
                            disconnect();
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            width: "100%",
                            background: "rgba(255,0,0,0.1)",
                            color: "#f56565",
                            fontWeight: "bold",
                            padding: "12px",
                            borderRadius: "8px",
                            transition: "all 0.3s",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,0,0,0.2)";
                            e.currentTarget.style.color = "#fc8181";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,0,0,0.1)";
                            e.currentTarget.style.color = "#f56565";
                          }}
                        >
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Wallet>
            </div>
          </header>

          {/* Swap Section — Focused on In-App */}
          <div style={{ textAlign: "center", margin: "40px 0" }}>
            <p style={{ color: "#aaa", fontSize: "18px", marginBottom: "16px" }}>
              New to Base? Connect your wallet and buy ETH directly inside it with card.
            </p>
            <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>

              <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
             <FundButton 
                text="Buy ETH/USDC with Card"
                // Optional: customize
                // asset="ETH" or "USDC"
              />
              {/* Swap Section — Focused on In-App */}
<div style={{ textAlign: "center", margin: "40px 0" }}>
  <p style={{ color: "#aaa", fontSize: "18px", marginBottom: "16px" }}>
    New to Base? Connect your wallet and buy ETH directly inside it with card.
  </p>
  <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
    <FundButton 
      text="Buy ETH/USDC with Card"
    />

    {/* Swap Widget Button */}
    <button
      onClick={() => setShowSwapModal(true)}
      style={{
        background: "#ffd700",
        color: "#000",
        padding: "16px 32px",
        borderRadius: "24px",
        fontWeight: "bold",
        fontSize: "22px",
        boxShadow: "0 4px 20px rgba(255,215,0,0.3)",
        transition: "transform 0.3s",
        border: "none",
        cursor: "pointer",
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
              style={{
                padding: "14px",
                width: "340px",
                background: "#111",
                border: "1px solid #444",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "18px",
              }}
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
                    ${p.usd.toFixed(2)} + Free Shipping
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
            <div style={{ marginBottom: "12px" }}>
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
            </div>

            <p style={{ color: "#666", fontSize: "14px", margin: "0" }}>
              © 2025 CARDS Collectibles LLC. All rights reserved.
            </p>
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

        {/* HOW TO BUY GUIDE – ZERO-KNOWLEDGE ONBOARDING */}
        {showHowToBuy && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
            onClick={() => setShowHowToBuy(false)}
          >
            <div
              style={{
                background: "#111",
                border: "3px solid #ffd700",
                borderRadius: "24px",
                padding: "40px",
                maxWidth: "620px",
                width: "100%",
                maxHeight: "95vh",
                overflowY: "auto",
                color: "#fff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  textAlign: "center",
                  color: "#ffd700",
                  fontSize: "32px",
                  marginBottom: "24px",
                }}
              >
                How to Buy in 4 Simple Steps (Even if You’ve Never Touched Crypto)
              </h2>

              <div style={{ marginBottom: "30px", padding: "20px", background: "rgba(0,255,157,0.1)", borderRadius: "16px", border: "1px dashed #00ff9d" }}>
                <p style={{ fontSize: "18px", marginBottom: "12px" }}>
                  <strong>Quick Explainers:</strong>
                </p>
                <ul style={{ listStyleType: "disc", paddingLeft: "20px", fontSize: "16px" }}>
                  <li>Crypto: Digital money, like online cash, that's secure and fast.</li>
                  <li>Coinbase: A trusted app for buying and holding crypto (like a bank app for digital money).</li>
                  <li>Base: A fast, low-cost network built by Coinbase for apps like ours—why Base? It's easy for beginners, with tiny fees (pennies per transaction).</li>
                  <li>Digital wallet: An app on your phone (like Coinbase Wallet) that holds your crypto, like a digital purse.</li>
                </ul>
              </div>

              <ol style={{ fontSize: "19px", lineHeight: "1.8", paddingLeft: "24px" }}>
                <li style={{ marginBottom: "20px" }}>
                  <strong>1. Connect a wallet (30 seconds)</strong>
                  <br />
                  Tap “Connect Wallet” → choose Smart Wallet or another → it sets up instantly (no complex setup).
                  <br />
                  <span style={{ color: "#ffd700", fontSize: "16px" }}>
                    What to do: If prompted, download the Coinbase Wallet app—it's free and secure.
                  </span>
                </li>

                <li style={{ marginBottom: "20px" }}>
                  <strong>2. Buy ETH with card</strong>
                  <br />
                  In your wallet app, tap "Buy" → use card or Apple Pay → get Base ETH (arrives instantly, no holds).
                  <br />
                  <span style={{ color: "#ffd700", fontSize: "16px" }}>
                    ETH is the 'gas' for Base—buy a bit more (~5%) if swapping to $CARDS to cover network fees.
                  </span>
                </li>

                <li style={{ marginBottom: "20px" }}>
                  <strong>3. Swap to $CARDS (optional for discount)</strong>
                  <br />
                  Tap “Trade $CARDS on Uniswap” → widget opens here → select ETH to $CARDS → swap.
                  <br />
                  <span style={{ color: "#ffd700", fontSize: "16px" }}>
                    Note: Includes ~3.5% trade tax (funds our discounts)—expect to get slightly less $CARDS. Skip for ETH/USDC payments.
                  </span>
                </li>

                <li style={{ marginBottom: "20px" }}>
                  <strong>4. Shop & pay</strong>
                  <br />
                  Add items → tap cart → choose payment ($CARDS for 10% off + free ship) → enter shipping → confirm/pay.
                  <br />
                  <span style={{ color: "#ffd700", fontSize: "16px" }}>
                    We ship USPS with tracking in 24-48h.
                  </span>
                </li>
              </ol>

              <div
                style={{
                  textAlign: "center",
                  margin: "30px 0",
                  padding: "20px",
                  background: "rgba(255,215,0,0.1)",
                  borderRadius: "16px",
                  border: "1px dashed #ffd700",
                }}
              >
                <p style={{ fontSize: "18px", margin: "0 0 12px 0" }}>
                  <strong>Beginner tip:</strong>
                  <br />
                  Use Smart Wallet → buy ETH inside → swap if wanted → shop. All in-app, no redirects.
                </p>
              </div>

              {/* SHIPPING & SUPPORT */}
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px 20px",
                  color: "#888",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
                <p style={{ margin: "10px 0" }}>
                  Ships US only via USPS (3–10 days). International soon.
                </p>
                <p style={{ margin: "10px 0" }}>
                  Issue? Send photo + tx → reship/refund in 24h.
                </p>
                <p style={{ margin: "16px 0 8px 0", fontWeight: "600", color: "#ffd700" }}>
                  Help?
                </p>
                <p style={{ margin: "8px 0" }}>
                  DM <a href="https://x.com/cardsonbaseHQ" target="_blank" rel="noopener noreferrer" style={{ color: "#ffd700", textDecoration: "underline" }}>@cardsonbaseHQ</a>
                  <br />
                  Email <a href="mailto:cardscollectibles@cardsonbase.com" style={{ color: "#ffd700", textDecoration: "underline" }}>cardscollectibles@cardsonbase.com</a>
                </p>
                <p style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
                   "With proven expertise in TCG sales and thousands in product value shipped, we're committed to your satisfaction." Learn more about us at cardsonbase.com/about
                </p>
              </div>

              <button
                onClick={() => setShowHowToBuy(false)}
                style={{
                  display: "block",
                  margin: "30px auto 0",
                  background: "#ffd700",
                  color: "#000",
                  padding: "14px 32px",
                  borderRadius: "16px",
                  fontWeight: "bold",
                  fontSize: "18px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Got it – Let’s Shop!
              </button>
            </div>
          </div>
        )}

        <WalletModal />
      </>
  );
}
