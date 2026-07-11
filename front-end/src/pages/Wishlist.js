import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import "../styless/wishlist.css";

const BASE_URL = "http://localhost:5000/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded._id ?? decoded.id ?? decoded.userId ?? null;
  } catch { return null; }
};

const toImgUrl = (path) =>
  path ? `http://localhost:5000/${path.replace(/\\/g, "/")}` : null;

const getDiscountedPrice = (price, discount) =>
  price ? Math.round(price - (price * (discount || 0)) / 100) : 0;

/* ══════════════════════════════════════════════════════════════════ */
function Wishlist() {
  const navigate      = useNavigate();
  const { userToken } = useAuth();
  const userId        = getUserIdFromToken(userToken);

  const [wishlist,  setWishlist]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [removing,  setRemoving]  = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast,     setToast]     = useState(null);
  const [addedIds,  setAddedIds]  = useState([]);

  /* ── Toast ────────────────────────────────────────────────────── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── Fetch ────────────────────────────────────────────────────── */
  const fetchWishlist = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const res  = await fetch(`${BASE_URL}/wishlist/getUserWishlist/${userId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load");
      setWishlist(data.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [userId, userToken]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  /* ── Remove from Wishlist (API) ───────────────────────────────── */
  const removeFromWishlist = async (productId) => {
    try {
      const res = await fetch(`${BASE_URL}/wishlist/toggle`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${userToken}`,
        },
        body: JSON.stringify({ userId, productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");

      // ✅ Local state update — card remove thay
      setWishlist(prev => prev.filter(item => {
        const pid = item.productId?._id ?? item.productId;
        return pid !== productId;
      }));
    } catch (e) {
      console.error("Wishlist remove error:", e.message);
    }
  };

  /* ── Remove (Confirm modal wala) ──────────────────────────────── */
  const handleRemove = async (productId) => {
    setConfirmId(null);
    setRemoving(productId);
    try {
      await removeFromWishlist(productId);
      showToast("Removed from wishlist 💔");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setRemoving(null);
    }
  };

  /* ── Add to Cart ──────────────────────────────────────────────── */
  const handleAddToCart = async (item) => {
    const prod      = item.productId;
    const activeVar = prod?.variants?.find(v => v.isActive);
    const productId = prod?._id;

    if (!productId) { showToast("Product not found", "error"); return; }

    if (addedIds.includes(productId)) {
      showToast("Already in cart! 🛒", "info");
      setTimeout(() => navigate("/Cart"), 700);
      return;
    }

    try {
      const res  = await fetch(`${BASE_URL}/cart/addToCart`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          userId,
          productId,
          quantity:  1,
          variantId: activeVar?._id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to add to cart");

      setAddedIds(p => [...p, productId]);

      // ✅ Cart ma add thaya pachhi wishlist mathi auto remove
      await removeFromWishlist(productId);

      showToast("Added to cart! Moving you there… 🛒");
      setTimeout(() => navigate("/Cart"), 1000);

    } catch (e) {
      showToast(e.message, "error");
    }
  };

  /* ── Order Now ────────────────────────────────────────────────── */
  const handleOrderNow = async (item) => {
    const prod      = item.productId;
    const activeVar = prod?.variants?.find(v => v.isActive);
    const price     = getDiscountedPrice(
      activeVar?.price ?? prod?.basePrice,
      activeVar?.discount ?? prod?.discount
    );
    const productId = prod?._id;

    // ✅ Order karta pehla wishlist mathi remove karo
    if (productId) {
      await removeFromWishlist(productId);
    }

    showToast("Taking you to checkout… ⚡");

    setTimeout(() => {
      navigate("/CheckOut", {
        state: {
          buyNow: {
            productId: prod?._id,
            variantId: activeVar?._id || null,
            name:      prod?.productName,
            price,
            quantity:  1,
            img:       prod?.images?.[0] ? toImgUrl(prod.images[0]) : "/no-image.png",
          }
        }
      });
    }, 600);
  };

  /* ── Not logged in ────────────────────────────────────────────── */
  if (!userId) return (
    <div className="wl-page">
      <div className="wl-blob wl-blob-1" /><div className="wl-blob wl-blob-2" />
      <div className="wl-empty">
        <div className="wl-empty-icon">🔐</div>
        <h3>Please Login</h3>
        <p>Login to see your saved wishlist items</p>
        <button className="wl-shop-btn" onClick={() => navigate("/login")}>Login Now →</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="wl-page">
      <div className="wl-empty">
        <div className="wl-spinner" />
        <p style={{ color: "#a08060", marginTop: 16 }}>Loading your wishlist…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="wl-page">
      <div className="wl-empty">
        <div className="wl-empty-icon">⚠️</div>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <button className="wl-shop-btn" onClick={fetchWishlist}>Try Again</button>
      </div>
    </div>
  );

  /* ══════ MAIN RENDER ══════════════════════════════════════════════ */
  return (
    <div className="wl-page">

      <div className="wl-blob wl-blob-1" />
      <div className="wl-blob wl-blob-2" />
      <div className="wl-blob wl-blob-3" />

      {/* Header */}
      <div className="wl-header">
        <div className="wl-header-badge">✦ Saved Items ✦</div>
        <h1 className="wl-title">
          My Wishlist <span className="wl-heart-pulse">🤍</span>
        </h1>
        <p className="wl-subtitle">
          {wishlist.length > 0
            ? `${wishlist.length} beautiful item${wishlist.length > 1 ? "s" : ""} waiting for you`
            : "Your saved items appear here"}
        </p>
      </div>

      {/* Empty state */}
      {wishlist.length === 0 && (
        <div className="wl-empty">
          <div className="wl-empty-icon wl-bounce">🧶</div>
          <h3>Your wishlist is empty</h3>
          <p>Tap the heart icon on any product to save it here</p>
          <button className="wl-shop-btn" onClick={() => navigate("/")}>
            Explore Products →
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {wishlist.length > 0 && (
        <div className="wl-grid">
          {wishlist.map((item, idx) => {
            const prod      = item.productId;
            const activeVar = prod?.variants?.find(v => v.isActive);
            const price     = getDiscountedPrice(
              activeVar?.price ?? prod?.basePrice,
              activeVar?.discount ?? prod?.discount
            );
            const oldPrice  = activeVar?.price ?? prod?.basePrice ?? 0;
            const discount  = activeVar?.discount ?? prod?.discount ?? 0;
            const imgSrc    = prod?.images?.[0] ? toImgUrl(prod.images[0]) : null;
            const productId = prod?._id ?? item.productId;
            const isRemov   = removing === productId;
            const inCart    = addedIds.includes(prod?._id);

            return (
              <div
                key={item._id ?? idx}
                className={`wl-card ${isRemov ? "wl-card-removing" : ""}`}
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                {/* Image */}
                <div className="wl-img-wrap">
                  {imgSrc
                    ? <img src={imgSrc} alt={prod?.productName} className="wl-img" />
                    : <div className="wl-img-ph">🧶</div>
                  }

                  {discount > 0 && (
                    <div className="wl-badge-discount">{discount}% OFF</div>
                  )}

                  <button
                    className="wl-heart-btn"
                    onClick={() => setConfirmId(productId)}
                    disabled={isRemov}
                    title="Remove"
                  >
                    {isRemov ? <span className="wl-btn-spin" /> : "♥"}
                  </button>

                  <div className="wl-img-overlay">
                    <span>Quick View</span>
                  </div>
                </div>

                {/* Body */}
                <div className="wl-body">
                  {prod?.categoryId?.categoryName && (
                    <span className="wl-cat">{prod.categoryId.categoryName}</span>
                  )}

                  <h3 className="wl-name">{prod?.productName ?? "Product"}</h3>

                  {prod?.material && (
                    <p className="wl-material">{prod.material}</p>
                  )}

                  <div className="wl-price-row">
                    <span className="wl-price">₹{price.toLocaleString("en-IN")}</span>
                    {oldPrice > price && (
                      <span className="wl-old-price">₹{oldPrice.toLocaleString("en-IN")}</span>
                    )}
                    {discount > 0 && (
                      <span className="wl-save-tag">
                        Save ₹{(oldPrice - price).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {prod?.stock != null && prod.stock > 0 && prod.stock <= 5 && (
                    <p className="wl-stock">🔥 Only {prod.stock} left!</p>
                  )}
                  {prod?.stock === 0 && (
                    <p className="wl-outstock">❌ Out of Stock</p>
                  )}

                  <div className="wl-btn-row">
                    <button
                      className={`wl-cart-btn ${inCart ? "wl-cart-added" : ""}`}
                      onClick={() => handleAddToCart(item)}
                      disabled={prod?.stock === 0}
                    >
                      {inCart ? "✓ In Cart" : "🛒 Add to Cart"}
                    </button>
                    <button
                      className="wl-order-btn"
                      onClick={() => handleOrderNow(item)}
                      disabled={prod?.stock === 0}
                    >
                      ⚡ Order Now
                    </button>
                  </div>

                  <button className="wl-del-link" onClick={() => setConfirmId(productId)}>
                    🗑 Remove from wishlist
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmId && (
        <div className="wl-overlay" onClick={() => setConfirmId(null)}>
          <div className="wl-modal" onClick={e => e.stopPropagation()}>
            <div className="wl-modal-ico">🗑️</div>
            <h3 className="wl-modal-title">Remove Item?</h3>
            <p className="wl-modal-sub">This item will be removed from your wishlist.</p>
            <div className="wl-modal-row">
              <button className="wl-modal-cancel" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
              <button className="wl-modal-confirm" onClick={() => handleRemove(confirmId)}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`wl-toast wl-toast-${toast.type ?? "success"}`}>
          <span>{toast.type === "error" ? "❌" : toast.type === "info" ? "ℹ️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default Wishlist;