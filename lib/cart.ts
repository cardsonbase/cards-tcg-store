// lib/cart.ts
import { create } from "zustand";

type CartItem = {
  id: string;
  name: string;
  usd: number;
  weightOz: number;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, amountToAdd?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem: (newItem, amountToAdd = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === newItem.id);
      const newQuantity = (existing?.quantity || 0) + amountToAdd;

      // Find current stock from global products (passed via page.tsx)
      // This is safe because we re-check at checkout anyway
      if (existing && newQuantity > 999) return state; // sanity cap

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === newItem.id ? { ...i, quantity: newQuantity } : i
          ),
        };
      }
      return { items: [...state.items, { ...newItem, quantity: amountToAdd }] };
    });
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateQuantity: (id, quantity) => set((state) => ({
    items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
  })),
  clear: () => set({ items: [] }),
}));