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

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const getZoneFromZip = (zip: string): number => {
  const p = zip.slice(0, 3);
  if (["710","711","712","713","714","716","717","718","719","755","756","757","758","759"].includes(p)) return 1;
  if (["700","701","703","704","705","706","707","708","709","750","751","752","753","754","760","761","762","763","764","765","766","767","768","769","770","771","772","773","774","775","776","777","778","779","780","781","782","783","784","785","786","787","788","789","790","791","792","793","794","795","796","797","798","799"].includes(p)) return 2;
  if (["720","721","722","723","724","725","726","727","728","729","730","731","733","734","735","736","737","738","739","740","741","743","744","745","746","747","748","749"].includes(p)) return 3;
  if (["600","601","602","603","604","605","606","607","608","609","610","611","612","613","614","615","616","617","618","619","620","622","623","624","625","626","627","628","629","630","631","633","634","635","636","637","638","639","640","641","642","643","644","645","646","647","648","649","650","651","652","653","654","655","656","657","658","659","660","661","662","663","664","665","666","667","668","669","670","671","672","673","674","675","676","677","678","679","680","681","682","683","684","685","686","687","688","689","690","691","692","693","694","695","696","697","698","699"].includes(p)) return 5;
  if (["500","501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","520","521","522","524","525","526","527","528","570","571","572","573","574","575","576","577","580","581","582","583","584","585","586","587","588","589","590","591","592","593","594","595"].includes(p)) return 6;
  if (["010","011","012","013","014","015","016","017","018","019","020","021","022","023","024","025","026","027","028","029","030","031","032","033","034","035","036","037","038","039","040","041","042","043","044","045","046","047","048","049","050","051","052","053","054","055","056","057","058","059","060","061","062","063","064","065","066","067","068","069","070","071","072","073","074","075","076","077","078","079","080","081","082","083","084","085","086","087","088","089","090","091","092","093","094","095","096","097","098","099"].includes(p)) return 7;
  return 8;
};

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
  const [calculatedShipping, setCalculatedShipping] = useState<number | null>(null);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const totalBaseUsd = cart.items.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalWeightOz = cart.items.reduce((s, i) => s + i.weightOz * i.quantity, 0);
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);

  const getRealShippingCost = (weightOz: number, zone: number): number => {
    const rates = {
      1: [0, 4.80, 5.30, 5.80, 6.30, 6.80, 7.30, 7.80, 8.30],
      2: [0, 5.10, 5.70, 6.30, 6.90, 7.50, 8.10, 8.70, 9.30],
      3: [0, 5.40, 6.10, 6.80, 7.50, 8.20, 8.90, 9.60, 10.30],
      4: [0, 5.70, 6.50, 7.30, 8.10, 8.90, 9.70, 10.50, 11.30],
      5: [0, 6.00, 6.90, 7.80, 8.70, 9.60, 10.50, 11.40, 12.30],
      6: [0, 6.30, 7.30, 8.30, 9.30, 10.30, 11.30, 12.30, 13.30],
      7: [0, 6.60, 7.70, 8.80, 9.90, 11.00, 12.10, 13.20, 14.30],
      8: [0, 7.00, 8.20, 9.40, 10.60, 11.80, 13.00, 14.20, 15.40],
    };
    const bracket = weightOz <= 4 ? 1 : weightOz <= 6 ? 2 : weightOz <= 8 ? 3 : weightOz <= 10 ? 4 : weightOz <= 12 ? 5 : weightOz <= 14 ? 6 : weightOz <= 15.999 ? 7 : 8;
    let cost = rates[zone as keyof typeof rates][bracket] || rates[8][8];
    if (weightOz > 16) cost += Math.ceil((weightOz - 16) / 16) * 11.50;
    return Math.ceil(cost * 20) / 20;
  };

  const shipping = calculatedShipping ?? 0;
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

  const calculateShippingCost = () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      alert("Please fill in all shipping fields.");
      return;
    }
    if (!US_STATES.includes(form.state.toUpperCase())) {
      alert("US shipping only — please use a valid state.");
      return;
    }
    if (!/^\d{5}$/.test(form.zip)) {
      alert("Please enter a valid 5-digit ZIP code.");
      return;
    }

    const zone = getZoneFromZip(form.zip);
    const cost = getRealShippingCost(totalWeightOz, zone);
    setCalculatedShipping(cost);
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
    email: form.email,           // ← ADD THIS LINE
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

          <label className="text-yellow-400 text-xl font-bold mb-2 block">Email (for receipt)</label>
<input
  type="email"
  required
  placeholder="you@gmail.com"
  value={form.email || ""}
  onChange={(e) => setForm({ ...form, email: e.target.value })}
  className="w-full p-5 mb-8 bg-[#1a1a1a] border-2 border-yellow-400/50 rounded-xl text-white text-xl hover:border-yellow-400 transition"
/>

          <button
            onClick={calculateShippingCost}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black py-5 rounded-2xl font-black text-3xl mb-6 transition"
          >
            GET SHIPPING QUOTE
          </button>

          {calculatedShipping !== null && (
            <div className="text-center mb-8 bg-black/40 rounded-2xl p-6 border border-green-400/50">
              <p className="text-green-400 text-2xl font-bold">Shipping: ${shipping.toFixed(2)}</p>
              <p className="text-green-400 text-3xl font-black mt-3">
                Total: ${totalUsd.toFixed(2)} ≈ {amount.toLocaleString()} $CARDS
              </p>
            </div>
          )}

          {/* REQUIRED TERMS CHECKBOX + FINAL PAY BUTTON */}
          <div className="mt-10 space-y-8">
            <label className="flex items-start gap-4 text-lg text-gray-200">
              <input
                type="checkbox"
                required
                checked={isTermsAccepted}
                onChange={(e) => setIsTermsAccepted(e.target.checked)}
                className="mt-1 h-6 w-6 rounded border-yellow-600 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
              />
              <span>
                I have read and agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-white">
                  Terms of Service
                </a>{" "}
                and understand all on-chain sales are final.
              </span>
            </label>

            <button
              onClick={handlePay}
              disabled={calculatedShipping === null || isPending || !isTermsAccepted || !address}
              className={`w-full py-8 rounded-3xl font-black text-5xl shadow-2xl transition-all ${
                calculatedShipping !== null && isTermsAccepted && !isPending && address
                  ? "bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isPending ? "CONFIRMING ON BASE..." : "CONFIRM & PAY"}
            </button>
          </div>
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
            className="bg-green-400 hover:bg-green-300 text-black px-24 py-7 rounded-2xl font-black text-4xl shadow-2xl transition"
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
                  className="text-red-500 hover:text-red-400 text-5xl font-black"
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
          <p className="text-gray-400 text-2xl mb-8">
            Shipping (US Only): <span className="text-yellow-400 font-bold">Calculated Next</span>
          </p>
          <p className="text-yellow-400 text-6xl font-black mb-4">TOTAL: ${totalUsd.toFixed(2)}</p>
          <p className="text-green-400 text-4xl font-black">≈ {amount.toLocaleString()} $CARDS</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-16">
          <button
            onClick={onClose}
            className="py-7 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-black text-3xl shadow-2xl transition"
          >
            KEEP SHOPPING
          </button>
          <button
            onClick={handleProceedToShipping}
            disabled={!address}
            className="py-7 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-black rounded-2xl font-black text-4xl shadow-2xl transition disabled:opacity-50"
          >
            PROCEED TO SHIPPING
          </button>
        </div>
      </div>
    </div>
  );
}