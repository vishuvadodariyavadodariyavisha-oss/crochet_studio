import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/authContext";
import "../styless/bulkorder.css";

const BASE_URL = "http://localhost:5000/";

const safeJson = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  await res.text();
  throw new Error(`Server error (${res.status})`);
};

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded._id || decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
};

const toImgUrl = (path) => (path ? BASE_URL + path.replace(/\\/g, "/") : "");
const getDiscountedPrice = (price, discount) =>
  price ? Math.round(price - (price * (discount || 0)) / 100) : 0;

const EVENT_TYPES = ["Wedding", "Baby Shower", "Birthday", "Corporate", "Anniversary", "Other"];

const YARN_PALETTE = [
  { hex: "#F8C8D0", name: "Blush Pink" },
  { hex: "#F4A0B0", name: "Rose" },
  { hex: "#E05C7E", name: "Deep Rose" },
  { hex: "#C8102E", name: "Crimson" },
  { hex: "#F4A342", name: "Marigold" },
  { hex: "#F9D26A", name: "Butter Yellow" },
  { hex: "#A8D8A8", name: "Sage Green" },
  { hex: "#4A8C5C", name: "Forest Green" },
  { hex: "#B0D4F1", name: "Sky Blue" },
  { hex: "#4A90D9", name: "Royal Blue" },
  { hex: "#7B4FA6", name: "Lavender Purple" },
  { hex: "#4A2C17", name: "Dark Brown" },
  { hex: "#8B5E3C", name: "Warm Brown" },
  { hex: "#D4C5A9", name: "Linen Beige" },
  { hex: "#F5F5F5", name: "Off White" },
  { hex: "#2D2D2D", name: "Charcoal" },
];

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    requested:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "Pending Review" },
    approved:   { color: "#10b981", bg: "rgba(16,185,129,0.12)",  label: "Approved" },
    rejected:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Rejected" },
    processing: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "Processing" },
    completed:  { color: "#6366f1", bg: "rgba(99,102,241,0.12)",  label: "Completed" },
    cancelled:  { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "Cancelled" },
  };
  const s = cfg[status] || cfg.requested;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 12px", borderRadius: "999px",
      fontSize: "13px", fontWeight: 600,
      color: s.color, background: s.bg, border: `1px solid ${s.color}40`,
    }}>
      {s.label}
    </span>
  );
};

// ── My Orders FAB — single source, CSS positions it ──────────────────────────
const MyOrdersFloatingBtn = ({ onClick }) => (
  <button className="my-orders-fab" onClick={onClick}>
    <span className="my-orders-fab-text">My Orders</span>
  </button>
);

// ── My Orders Modal ───────────────────────────────────────────────────────────
const MyOrdersModal = ({ userId, token, onClose }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}api/bulkorders/getMyBulkOrders/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await safeJson(res);
        if (data.success) setOrders(data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, token]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">My Bulk Orders</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        {loading && <p className="modal-empty">Loading...</p>}
        {!loading && orders.length === 0 && (
          <p className="modal-empty">No bulk orders yet.</p>
        )}

        {orders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-card-top">
              <div>
                <p className="order-product-name">
                  {order.productId?.productName || order.productType}
                </p>
                <p className="order-meta">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                  {" · "}Qty: {order.quantity}
                  {order.quotedPrice
                    ? ` · Quoted: Rs.${order.quotedPrice.toLocaleString("en-IN")}`
                    : order.finalAmount
                    ? ` · Rs.${order.finalAmount.toLocaleString("en-IN")}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {order.adminNote && (
              <div className="order-admin-note">
                <strong>Admin Note:</strong> {order.adminNote}
              </div>
            )}

            {order.status === "approved" && order.paymentStatus !== "paid" && (
              <div className="order-pay-banner">
                <div>
                  <p className="pay-banner-title">Order Approved</p>
                  <p className="pay-banner-sub">
                    Complete payment to start production
                    {order.quotedPrice && ` · Rs.${order.quotedPrice.toLocaleString("en-IN")}`}
                    {!order.quotedPrice && order.finalAmount &&
                      ` · Rs.${order.finalAmount.toLocaleString("en-IN")}`}
                  </p>
                </div>
                <button
                  className="pay-now-btn"
                  onClick={() => { onClose(); navigate(`/payment/${order._id}?type=bulk`); }}
                >
                  Pay Now
                </button>
              </div>
            )}

            {order.paymentStatus === "paid" && (
              <div className="order-paid-badge">Payment Complete</div>
            )}

            {order.status === "requested" && (
              <div className="order-pending-note">
                Waiting for admin approval. Payment will be enabled once approved.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Product Picker ────────────────────────────────────────────────────────────
const ProductPicker = ({ token, onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}api/product/getAllProducts`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await safeJson(res);
        setProducts(data.products || data.data || data || []);
      } catch {
        setError("Could not load products. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = products.filter(
    (p) =>
      p.productName?.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryId?.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 16px 60px" }}>
      <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <div className="step-badge">STEP 1 OF 2</div>
        <h2 className="picker-heading">Choose a Product</h2>
        <p className="picker-sub">Select the product you would like to order in bulk</p>
      </div>

      <input
        type="text"
        placeholder="Search products or categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="picker-search"
      />

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
          <div className="spinner-border text-secondary mb-3" role="status"
            style={{ width: "32px", height: "32px" }}></div>
          <p style={{ margin: 0 }}>Loading products...</p>
        </div>
      )}
      {error && <div className="picker-error">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
          <p>No products found{search ? ` for "${search}"` : ""}.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="picker-grid">
          {filtered.map((prod) => {
            const activeVariant = prod.variants?.find((v) => v.isActive);
            const price = getDiscountedPrice(
              activeVariant?.price || prod.basePrice,
              activeVariant?.discount || prod.discount
            );
            const imgSrc = prod.images?.[0] ? toImgUrl(prod.images[0]) : null;
            return (
              <button key={prod._id} type="button" onClick={() => onSelect(prod)} className="picker-product-card">
                <div className="picker-product-img-wrap">
                  {imgSrc
                    ? <img src={imgSrc} alt={prod.productName} className="picker-product-img" />
                    : <div className="picker-product-img-fallback">No Image</div>}
                  {(activeVariant?.discount || prod.discount) > 0 && (
                    <div className="picker-discount-badge">
                      {activeVariant?.discount || prod.discount}% OFF
                    </div>
                  )}
                </div>
                <div className="picker-product-body">
                  {prod.categoryId?.categoryName && (
                    <span className="picker-category">{prod.categoryId.categoryName}</span>
                  )}
                  <p className="picker-product-name">{prod.productName}</p>
                  {prod.material && <p className="picker-material">{prod.material}</p>}
                  <div className="picker-product-footer">
                    <span className="picker-price">Rs.{price.toLocaleString("en-IN")}</span>
                    <span className="picker-select-tag">Select</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function BulkOrder() {
  const { productId: urlProductId } = useParams();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const userId = getUserIdFromToken(userToken);

  const [pickedProduct, setPickedProduct] = useState(null);
  const productId = urlProductId || pickedProduct?._id;

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [showMyOrders, setShowMyOrders] = useState(false);

  const [quantity, setQuantity] = useState(10);
  const [eventType, setEventType] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [customText, setCustomText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedYarnColors, setSelectedYarnColors] = useState([]);
  const [colorNotes, setColorNotes] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (!urlProductId) return;
    (async () => {
      try {
        setProductLoading(true);
        setProductError(null);
        const res = await fetch(`${BASE_URL}api/product/getProductById/${urlProductId}`);
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data?.message || "Failed to fetch product");
        const prod = data.product || data;
        setProduct(prod);
        if (prod.images?.length) setMainImage(toImgUrl(prod.images[0]));
        const active = (prod.variants || []).filter((v) => v.isActive);
        if (active.length) setSelectedVariant(active[0]);
      } catch (e) {
        setProductError(e.message);
      } finally {
        setProductLoading(false);
      }
    })();
  }, [urlProductId]);

  const handleProductPick = (prod) => {
    setPickedProduct(prod);
    setProduct(prod);
    if (prod.images?.length) setMainImage(toImgUrl(prod.images[0]));
    const active = (prod.variants || []).filter((v) => v.isActive);
    setSelectedVariant(active.length ? active[0] : null);
  };

  const handleChangeProduct = () => {
    setPickedProduct(null); setProduct(null);
    setSelectedVariant(null); setMainImage(""); setProductError(null);
  };

  const basePrice = selectedVariant
    ? getDiscountedPrice(selectedVariant.price, selectedVariant.discount)
    : getDiscountedPrice(product?.basePrice, product?.discount);
  const subtotal = basePrice * quantity;
  const discountPct = subtotal >= 50000 ? 7 : subtotal >= 30000 ? 5 : subtotal >= 15000 ? 3 : 0;
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const finalTotal = subtotal - discountAmount;
  const activeVariants = (product?.variants || []).filter((v) => v.isActive);

  const sizeLabel = (s) => {
    const m = { s:"Small", m:"Medium", l:"Large", xl:"Extra Large", xxl:"XX-Large",
      small:"Small", medium:"Medium", large:"Large" };
    return m[s?.toLowerCase()] || s;
  };

  const toggleYarnColor = (hex) =>
    setSelectedYarnColors((p) => p.includes(hex) ? p.filter((c) => c !== hex) : [...p, hex]);

  const resetForm = () => {
    setQuantity(10); setEventType(""); setDeliveryDate("");
    setSelectedSize(""); setCustomText(""); setInstructions("");
    setSelectedYarnColors([]); setColorNotes("");
  };

  // ── Submit — NO stock deduction here. ──────────────────────────────────────
  // Stock is deducted in paymentController.js after admin approves + user pays.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!userId) { navigate("/login"); return; }
    if (quantity < 10) { setSubmitError("Minimum quantity is 10."); return; }

    try {
      setSubmitLoading(true);
      const payload = {
        userId, productId,
        quantity: Number(quantity),
        customText,
        selectedSize: selectedSize || selectedVariant?.size || "",
        instructions, eventType,
        deliveryDate: deliveryDate || null,
        yarnColors: selectedYarnColors,
        primaryColor: selectedYarnColors[0] || "",
        secondaryColor: selectedYarnColors[1] || "",
        colorNotes,
        variantId: selectedVariant?._id || null,
        orderType: "quote",
      };

      const res = await fetch(`${BASE_URL}api/bulkorders/createBulkOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to submit.");

      setPlacedOrder(data.bulkOrder);
      setSubmitSuccess(true);
      resetForm();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (productLoading)
    return (
      <div className="bulk-page d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border text-secondary mb-3" role="status"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );

  if (productError)
    return (
      <div className="bulk-page d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center text-danger">
          <p>{productError}</p>
          <button className="btn btn-outline-secondary mt-2" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );

  // ── Product Picker ───────────────────────────────────────────────────────────
  if (!product)
    return (
      <div className="bulk-page">
        {userId && <MyOrdersFloatingBtn onClick={() => setShowMyOrders(true)} />}
        <div className="bulk-hero">
          <div className="bulk-hero-badge">Handcrafted with Love</div>
          <h1 className="bulk-title">Bulk Order Studio</h1>
          <p className="bulk-subtitle">Ideal for weddings, corporate gifting and luxury events.</p>
        </div>
        <ProductPicker token={userToken} onSelect={handleProductPick} />
        {showMyOrders && <MyOrdersModal userId={userId} token={userToken} onClose={() => setShowMyOrders(false)} />}
      </div>
    );

  // ── Success ──────────────────────────────────────────────────────────────────
  if (submitSuccess && placedOrder)
    return (
      <div className="bulk-page d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh", padding: "24px" }}>
        {userId && <MyOrdersFloatingBtn onClick={() => setShowMyOrders(true)} />}
        <div className="success-card">
          <h2 className="success-title">Quote Requested</h2>
          <p className="success-desc">
            Your bulk order has been submitted. Admin will review and approve it.
            Once approved, you will be able to complete the payment.
          </p>
          <div className="success-detail-box">
            <div className="success-detail-row">
              <span>Status</span>
              <StatusBadge status={placedOrder.status} />
            </div>
            <div className="success-detail-row">
              <span>Quantity</span>
              <span className="success-detail-val">{placedOrder.quantity} pcs</span>
            </div>
            <div className="success-detail-row">
              <span>Estimated Total</span>
              <span className="success-detail-amount">
                Rs.{placedOrder.finalAmount?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="success-next-steps">
            <p className="next-steps-title">What happens next?</p>
            <p className="next-steps-body">
              1. Admin reviews your order and sets a final price.<br />
              2. Once approved, you will see a Pay Now button in My Orders.<br />
              3. Complete payment to begin production.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-secondary-action"
              onClick={() => {
                setSubmitSuccess(false); setPlacedOrder(null);
                if (!urlProductId) handleChangeProduct();
              }}>
              Place Another
            </button>
            {userId && (
              <button className="btn-primary-action" onClick={() => setShowMyOrders(true)}>
                My Orders
              </button>
            )}
          </div>
        </div>
        {showMyOrders && <MyOrdersModal userId={userId} token={userToken} onClose={() => setShowMyOrders(false)} />}
      </div>
    );

  // ── Main Form ────────────────────────────────────────────────────────────────
  return (
    <div className="bulk-page">
      {userId && <MyOrdersFloatingBtn onClick={() => setShowMyOrders(true)} />}

      <div className="bulk-hero">
        <div className="bulk-hero-badge">Handcrafted with Love</div>
        <h1 className="bulk-title">Bulk Order Studio</h1>
        <p className="bulk-subtitle">Ideal for weddings, corporate gifting and luxury events.</p>
      </div>

      {!urlProductId && (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px 8px" }}>
          <button type="button" onClick={handleChangeProduct} className="change-product-btn">
            Change Product
          </button>
        </div>
      )}

      <div className="bulk-container">
        {submitError && (
          <div className="alert alert-danger text-center py-2 mb-4 rounded-3">{submitError}</div>
        )}

        <div className="info-banner">
          <div>
            <p className="info-banner-title">How Bulk Orders Work</p>
            <p className="info-banner-body">
              Submit request. Admin reviews and approves. Pay full amount after approval.
              Production begins. Stock is reserved only after payment.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-4">

            {/* LEFT COLUMN */}
            <div className="col-lg-7">

              {/* Card 01 */}
              <div className="bulk-product-card mb-4">
                <div className="bulk-card-index">01</div>
                <div className="d-flex gap-4 align-items-start flex-wrap">
                  <div className="bulk-image-section">
                    {mainImage
                      ? <img src={mainImage} alt={product.productName}
                          style={{ width:"120px", height:"120px", objectFit:"cover", borderRadius:"12px" }} />
                      : <div className="bulk-image-upload-area" style={{ width:"120px", height:"120px" }}>
                          <div className="bulk-upload-placeholder">
                            <div className="bulk-upload-icon">No Image</div>
                          </div>
                        </div>}
                    {product.images?.length > 1 && (
                      <div className="d-flex gap-1 mt-2 flex-wrap" style={{ maxWidth: "120px" }}>
                        {product.images.slice(0, 4).map((img, i) => (
                          <img key={i} src={toImgUrl(img)} alt="" onClick={() => setMainImage(toImgUrl(img))}
                            style={{
                              width:"28px", height:"28px", objectFit:"cover",
                              borderRadius:"4px", cursor:"pointer",
                              border: mainImage === toImgUrl(img) ? "2px solid #8B5E3C" : "2px solid #e0d8d0",
                            }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bulk-product-details flex-fill">
                    <h3 className="bulk-product-name" style={{ textTransform: "capitalize" }}>
                      {product.productName}
                    </h3>
                    <p className="bulk-product-base-price mb-1">
                      {product.categoryId?.categoryName && (
                        <span className="badge bg-light text-muted border me-2">
                          {product.categoryId.categoryName}
                        </span>
                      )}
                      Base Price: <strong>Rs.{basePrice.toLocaleString("en-IN")}</strong>
                      {(selectedVariant?.discount || product?.discount) > 0 && (
                        <span className="badge bg-success ms-2">
                          {selectedVariant?.discount || product?.discount}% OFF
                        </span>
                      )}
                    </p>
                    {product.material && <p className="text-muted small mb-0">Material: {product.material}</p>}
                  </div>
                </div>

                {activeVariants.length > 0 && (
                  <div className="mt-3">
                    <label className="form-label fw-semibold">Select Variant</label>
                    <div className="d-flex flex-wrap gap-2">
                      {activeVariants.map((v) => (
                        <button key={v._id} type="button"
                          onClick={() => { setSelectedVariant(v); setSelectedSize(v.size || ""); }}
                          className={`btn btn-sm ${selectedVariant?._id === v._id ? "btn-brown" : "btn-outline-secondary"}`}
                          style={{ borderRadius: "20px", fontSize: "13px" }}>
                          {[v.size ? sizeLabel(v.size) : null, v.layers||null, v.petalType||null]
                            .filter(Boolean).join(" · ")}
                          {" — Rs."}{getDiscountedPrice(v.price, v.discount)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <label className="form-label fw-semibold">Quantity <span className="text-danger">*</span></label>
                  <div className="bulk-qty-control" style={{ maxWidth: "180px" }}>
                    <button type="button" onClick={() => setQuantity(Math.max(10, quantity - 1))}>-</button>
                    <input type="number" min="10" value={quantity}
                      onChange={(e) => setQuantity(Math.max(10, Number(e.target.value)))} />
                    <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                  <small className="text-muted">Minimum 10 pieces</small>
                </div>
              </div>

              {/* Card 02 — Colors */}
              <div className="bulk-color-card mb-4">
                <div className="bulk-card-index">02</div>
                <h5 className="bulk-section-title">Yarn and Thread Colors</h5>
                <p className="bulk-section-sub">Choose the colors for your handcrafted pieces.</p>

                <div className="bulk-yarn-palette">
                  {YARN_PALETTE.map((c) => (
                    <div key={c.hex} className="bulk-yarn-swatch-wrap">
                      <button type="button" title={c.name}
                        className={`bulk-yarn-swatch ${selectedYarnColors.includes(c.hex) ? "bulk-swatch-selected" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => toggleYarnColor(c.hex)}>
                        {selectedYarnColors.includes(c.hex) && <span className="bulk-swatch-check">v</span>}
                      </button>
                      <span className="bulk-swatch-label">{c.name}</span>
                    </div>
                  ))}
                </div>

                {selectedYarnColors.length > 0 && (
                  <div className="bulk-selected-preview">
                    <span className="bulk-selected-label">Selected ({selectedYarnColors.length})</span>
                    <div className="bulk-selected-chips">
                      {selectedYarnColors.map((hex) => (
                        <div key={hex} className="bulk-chip">
                          <span className="bulk-chip-dot" style={{ backgroundColor: hex }}></span>
                          <span className="bulk-chip-hex">{hex}</span>
                          <button type="button" className="bulk-chip-x" onClick={() => toggleYarnColor(hex)}>x</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <label className="form-label fw-semibold">Color Notes</label>
                  <input type="text" className="form-control"
                    placeholder="e.g. Pastel shades preferred, avoid neon..."
                    value={colorNotes} onChange={(e) => setColorNotes(e.target.value)} />
                </div>
              </div>

              {/* Card 03 — Order Details */}
              <div className="bulk-product-card">
                <div className="bulk-card-index">03</div>
                <h5 className="fw-bold mb-3 mt-1" style={{ color: "#1a1a1a" }}>Order Details</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Event Type</label>
                    <select className="form-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="">Select event type</option>
                      {EVENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Preferred Delivery Date</label>
                    <input type="date" className="form-control" value={deliveryDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                  {activeVariants.length === 0 && (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Size Preference</label>
                      <input type="text" className="form-control" placeholder="e.g. Small, Medium, Large"
                        value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} />
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label fw-semibold">Custom Text / Name</label>
                    <input type="text" className="form-control"
                      placeholder="e.g. Name to print, message to add"
                      value={customText} onChange={(e) => setCustomText(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Special Instructions</label>
                    <textarea className="form-control" rows="3"
                      placeholder="Design details, packaging requirements..."
                      value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Summary */}
            <div className="col-lg-5">
              <div className="bulk-summary-card" style={{ position: "sticky", top: "90px" }}>
                <h3>Order Summary</h3>

                <div className="d-flex align-items-center gap-3 mb-3 pb-3"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  {mainImage && <img src={mainImage} alt=""
                    style={{ width:"50px", height:"50px", objectFit:"cover", borderRadius:"8px" }} />}
                  <div>
                    <p className="mb-0 fw-semibold"
                      style={{ textTransform:"capitalize", fontSize:"14px", color:"#1a1a1a" }}>
                      {product.productName}
                    </p>
                    {selectedVariant && (
                      <small style={{ color: "#999" }}>
                        {[selectedVariant.size ? sizeLabel(selectedVariant.size) : null,
                          selectedVariant.layers||null, selectedVariant.petalType||null]
                          .filter(Boolean).join(" · ")}
                      </small>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <span className="bulk-badge-quote">Quote Request — Admin Review Required</span>
                </div>

                <div className="summary-payment-note">
                  Payment will be available after admin approval
                </div>

                {selectedYarnColors.length > 0 && (
                  <div className="mb-3 pb-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    <p style={{ fontSize:"11px", color:"#bbb", marginBottom:"8px",
                      letterSpacing:"1px", textTransform:"uppercase" }}>
                      Yarn Colors
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedYarnColors.map((hex) => (
                        <div key={hex} title={hex} style={{
                          width:"22px", height:"22px", borderRadius:"50%",
                          backgroundColor: hex, border:"2px solid rgba(0,0,0,0.1)",
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="bulk-summary-line"><span>Unit Price</span><span>Rs.{basePrice.toLocaleString("en-IN")}</span></div>
                <div className="bulk-summary-line"><span>Quantity</span><span>{quantity} pcs</span></div>
                <div className="bulk-summary-line"><span>Subtotal</span><span>Rs.{subtotal.toLocaleString("en-IN")}</span></div>
                {discountPct > 0 && (
                  <div className="bulk-summary-line" style={{ color: "#059669" }}>
                    <span>Bulk Discount ({discountPct}%)</span>
                    <span>- Rs.{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {subtotal > 0 && (
                  <div className="discount-tiers-info">
                    3% off Rs.15k+ &nbsp;|&nbsp; 5% off Rs.30k+ &nbsp;|&nbsp; 7% off Rs.50k+
                  </div>
                )}

                <div className="bulk-summary-divider" />
                <div className="bulk-summary-total">
                  <span style={{ color:"#888", fontSize:"14px" }}>Estimated Total</span>
                  <span className="bulk-grand-total-amount">Rs.{finalTotal.toLocaleString("en-IN")}</span>
                </div>

                <button type="submit" className="bulk-submit-btn" disabled={submitLoading}>
                  {submitLoading
                    ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Submitting...</>
                    : "Submit Order Request"}
                </button>

                <p className="bulk-summary-note">
                  Admin will review your request and set a final price. You will be notified to complete payment.
                </p>

                <button type="button" className="btn w-100 mt-2"
                  style={{ color:"#888", border:"1px solid #e0d8d0", fontSize:"13px" }}
                  onClick={() => urlProductId ? navigate(-1) : handleChangeProduct()}>
                  {urlProductId ? "Back to Product" : "Change Product"}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>

      {showMyOrders && (
        <MyOrdersModal userId={userId} token={userToken} onClose={() => setShowMyOrders(false)} />
      )}
    </div>
  );
}