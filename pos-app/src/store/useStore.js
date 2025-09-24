import { create } from "zustand";

export const useStore = create((set) => ({
  cart: [],
  addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
  clearCart: () => set({ cart: [] }),
  orders: [],
  setOrders: (orders) => set({ orders }),
}));
