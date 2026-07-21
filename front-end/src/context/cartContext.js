// context/CartContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

const BASE_URL = "http://localhost:5000/";

const CartContext = createContext();

// Decode JWT to get userId
const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded._id || decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
};

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count from API
  const fetchCartCount = useCallback(async (userToken) => {
    try {
      const userId = getUserIdFromToken(userToken);
      if (!userId) { setCartCount(0); return; }

      const res = await fetch(`${BASE_URL}api/cart/getCart/${userId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // products array length = number of unique items in cart
      const products = data?.cart?.products || data?.products || [];
      setCartCount(products.length);
    } catch {
      setCartCount(0);
    }
  }, []);

  // Increment count locally (optimistic update — no extra API call)
  const incrementCartCount = () => setCartCount((prev) => prev + 1);

  // Reset on logout
  const resetCartCount = () => setCartCount(0);

  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount, incrementCartCount, resetCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");
  return ctx;
}