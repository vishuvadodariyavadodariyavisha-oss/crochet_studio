import React, { useState, useEffect, useContext } from "react";
import "../styless/cart.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { jwtDecode } from "jwt-decode";

export default function Cart() {
  const navigate = useNavigate();
  const { userToken } = useContext(AuthContext);

  const [cart, setCart]             = useState([]);
  const [userId, setUserId]         = useState(null);
  const [loadingItems, setLoadingItems] = useState({});
  const [error, setError]           = useState(null);

  // ================= GET USER ID =================
  useEffect(() => {
    if (!userToken) return;
    try {
      const decoded = jwtDecode(userToken);
      setUserId(decoded.id || decoded._id || decoded.userId);
    } catch (err) {
      console.log("Token decode error:", err);
    }
  }, [userToken]);

  // ================= FETCH CART =================
  const fetchCart = async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`http://localhost:5000/api/cart/getUserCart/${userId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();

      if (data?.products) {
        const mapped = data.products.map((item) => {
          let stock        = 999;
          let variantPrice = null;
          let variantDiscount = 0;

          if (item.variantId && item.productId.variants?.length > 0) {
            const variant = item.productId.variants.find(
              (v) => v._id.toString() === item.variantId.toString()
            );
            if (variant) {
              // ✅ available = stockQuantity - reservedQuantity
              stock           = Math.max(0, (variant.stockQuantity || 0) - (variant.reservedQuantity || 0));
              variantPrice    = variant.price;
              variantDiscount = variant.discount || 0;
            }
          } else {
            // ✅ No-variant product — same available logic
            const p = item.productId;
            stock = Math.max(0, (p.stockQuantity || 0) - (p.reservedQuantity || 0));
          }

          const basePrice       = variantPrice || item.productId.basePrice;
          const discount        = variantPrice ? variantDiscount : (item.productId.discount || 0);
          const discountedPrice = Math.round(basePrice - (basePrice * discount) / 100);
          const key             = `${item.productId._id}_${item.variantId || "none"}`;

          return {
            id:            item.productId._id,
            name:          item.productId.productName,
            price:         discountedPrice,
            originalPrice: discount > 0 ? basePrice : null,
            discount,
            quantity:      item.quantity,
            img:           item.productId.images?.[0]
              ? `http://localhost:5000/${item.productId.images[0].replace(/\\/g, "/")}`
              : "/no-image.png",
            variantId: item.variantId || null,
            stock,   // ✅ = stockQty - reservedQty (actual available)
            key,
          };
        });

        setCart(mapped);
      } else {
        setCart([]);
      }
    } catch (err) {
      console.log("Fetch Cart Error:", err);
      setError("Failed to load cart. Please try again.");
    }
  };

  useEffect(() => {
    if (userId) fetchCart();
  }, [userId]);

  // ================= UPDATE QUANTITY =================
  const updateQuantity = async (productId, variantId, type, currentQty, stock) => {
    if (!userId) return;

    // ✅ Frontend pn available stock check kare
    if (type === "inc" && currentQty >= stock) {
      setError(`Sorry! Only ${stock} items available in stock.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const key = `${productId}_${variantId || "none"}`;
    setLoadingItems((prev) => ({ ...prev, [key]: true }));
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/cart/updateCartItem`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          userId,
          productId,
          variantId,
          action: type === "inc" ? "increment" : "decrement",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchCart();
      } else {
        setError(data.message || "Failed to update quantity.");
      }
    } catch (err) {
      console.log("Update Cart Error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoadingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ================= REMOVE ITEM =================
  const removeItem = async (productId, variantId) => {
    if (!userId) return;

    const key = `${productId}_${variantId || "none"}`;
    setLoadingItems((prev) => ({ ...prev, [key]: true }));
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/cart/removeCartItem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ userId, productId, variantId }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchCart();
      } else {
        setError(data.message || "Failed to remove item.");
      }
    } catch (err) {
      console.log("Remove Cart Error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoadingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ================= CALCULATE TOTALS =================
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = 0;
  const tax      = subtotal * 0.08;
  const total    = subtotal + shipping + tax;

  return (
    <div className="cart-container">
      <div className="cart-left">
        <h2 className="cart-title">Your Shopping Cart</h2>

        {error && <div className="cart-error-banner">⚠️ {error}</div>}

        {cart.length > 0 ? (
          cart.map((item) => {
            const isLoading     = loadingItems[item.key];
            const isOutOfStock  = item.stock === 0;
            const isMaxReached  = item.quantity >= item.stock;

            return (
              <div
                key={item.key}
                className={`cart-item ${isLoading ? "cart-item--loading" : ""}`}
              >
                <img src={item.img} alt={item.name} />
                <div className="item-info">
                  <h4>{item.name}</h4>

                  <div className="item-price-row">
                    <p className="item-price">₹{item.price.toLocaleString("en-IN")}</p>
                    {item.originalPrice && (
                      <>
                        <p className="item-original-price">
                          ₹{item.originalPrice.toLocaleString("en-IN")}
                        </p>
                        <span className="item-discount-badge">{item.discount}% OFF</span>
                      </>
                    )}
                  </div>

                  {/* ✅ Available stock warnings */}
                  {item.stock <= 5 && item.stock > 0 && (
                    <span className="stock-warning">⚡ Only {item.stock} left!</span>
                  )}
                  {isOutOfStock && (
                    <span className="stock-out">❌ Out of Stock</span>
                  )}

                  <div className="qty-box">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.variantId, "dec", item.quantity, item.stock)
                      }
                      disabled={isLoading || item.quantity <= 1}
                      className="qty-btn"
                    >−</button>

                    <span className="qty-value">{item.quantity}</span>

                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.variantId, "inc", item.quantity, item.stock)
                      }
                      disabled={isLoading || isMaxReached || isOutOfStock}
                      className={`qty-btn ${isMaxReached ? "qty-btn--disabled" : ""}`}
                      title={isMaxReached ? `Max available: ${item.stock}` : ""}
                    >+</button>
                  </div>

                  {isMaxReached && !isOutOfStock && (
                    <p className="stock-max-msg">
                      Max quantity reached ({item.stock} available)
                    </p>
                  )}

                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item.id, item.variantId)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h5>Your cart is empty</h5>
            <p>Add some beautiful crochet items to get started!</p>
            <button className="continue-shopping-btn" onClick={() => navigate("/product")}>
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* ORDER SUMMARY */}
      <div className="cart-right">
        <h3>Order Summary</h3>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span className="free-shipping">FREE</span>
        </div>
        <div className="summary-row">
          <span>Tax (8%)</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <hr />
        <div className="summary-row total">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>

        <button
          className="checkout-btn"
          onClick={() => navigate("/CheckOut")}
          disabled={cart.length === 0}
        >
          Proceed to Checkout
        </button>

        <button
          className="continue-shopping-btn-outline"
          onClick={() => navigate("/product")}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}