import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styless/customizeOrder.css";
import { useAuth } from "../context/authContext";

// ─── API Base URL ─────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:5000/api/customization";

const COLOR_SWATCHES = [
  { name: "Cream",    hex: "#f5ede4" },
  { name: "Mocha",    hex: "#6f4e37" },
  { name: "Caramel",  hex: "#d4a05a" },
  { name: "Espresso", hex: "#3d2b1f" },
  { name: "Blush",    hex: "#e8b4a0" },
  { name: "Sage",     hex: "#8aab96" },
  { name: "Lavender", hex: "#b39ddb" },
  { name: "Sky Blue", hex: "#81d4fa" },
  { name: "Rose",     hex: "#f48fb1" },
  { name: "Mint",     hex: "#a5d6a7" },
  { name: "Mustard",  hex: "#ffd54f" },
  { name: "Charcoal", hex: "#3a3a3a" },
];

const COLOR_NAME_MAP = {
  "#f5ede4": "Cream",
  "#6f4e37": "Mocha",
  "#d4a05a": "Caramel",
  "#3d2b1f": "Espresso",
  "#e8b4a0": "Blush",
  "#8aab96": "Sage",
  "#b39ddb": "Lavender",
  "#81d4fa": "Sky Blue",
  "#f48fb1": "Rose",
  "#a5d6a7": "Mint",
  "#ffd54f": "Mustard",
  "#3a3a3a": "Charcoal",
};

const getColorName = (hex) => COLOR_NAME_MAP[hex] ?? hex.toUpperCase();

const YARN_TYPES = ["Cotton", "Wool", "Acrylic", "Bamboo", "Linen", "Mixed"];

const ITEM_TYPES = [
  "Amigurumi / Toy",
  "Bag / Tote",
  "Cardigan / Sweater",
  "Hat / Beanie",
  "Scarf / Shawl",
  "Baby Blanket",
  "Home Decor",
  "Keychain",
  "Other",
];

const EVENT_OPTIONS = [
  "Birthday", "Baby Shower", "Wedding", "Anniversary",
  "Corporate Gift", "Festival", "Just Because", "Other",
];

const SAMPLE_PRODUCT = {
  name: "Custom Crochet Item",
  description: "Handmade with love · Tell us what you need!",
};

// ─── Helper: Get logged-in user + token from localStorage ────────────────────
// const getLoggedInUser = () => {
//   try {
//     return JSON.parse(localStorage.getItem("user")) ?? null;
//   } catch {
//     return null;
//   }
// };

export default function CustomizeOrder() {
  const navigate = useNavigate();
  const { userToken } = useAuth();

  const [selectedColor,       setSelectedColor]       = useState("");
  const [customColor,         setCustomColor]         = useState("#6f4e37");
  const [selectedYarn,        setSelectedYarn]        = useState("");
  const [selectedItem,        setSelectedItem]        = useState("");
  const [size,                setSize]                = useState("");
  const [customText,          setCustomText]          = useState("");
  const [recipientName,       setRecipientName]       = useState("");
  const [occasion,            setOccasion]            = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [images,              setImages]              = useState([]);
  const [quantity,            setQuantity]            = useState(1);
  const [giftWrap,            setGiftWrap]            = useState(false);

  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [orderData, setOrderData] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map((file) => ({ url: URL.createObjectURL(file), file }));
    setImages((prev) => [...prev, ...previews].slice(0, 5));
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleQty = (action) =>
    setQuantity((prev) => (action === "inc" ? prev + 1 : Math.max(1, prev - 1)));

  const handleReset = () => {
    setSelectedColor(""); setSelectedYarn(""); setSelectedItem("");
    setSize(""); setCustomText(""); setRecipientName(""); setOccasion("");
    setSpecialInstructions(""); setImages([]); setQuantity(1); setGiftWrap(false);
    setOrderData(null);
  };

  // ─── Submit → POST /api/customization/create ──────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      showToast("error", "Please select what item you'd like.");
      return;
    }

    // ── Auth check ──────────────────────────────────────────────────────────
    if (!userToken) {
      showToast("error", "Please log in to place a customization order.");
      return;
    }

    const activeColor = selectedColor || customColor;

    // ── Payload ─────────────────────────────────────────────────────────────
    // Backend reads customerName/Email from req.user via auth middleware,
    // so we only need to send the customization fields here.
    const body = {
      itemType:            selectedItem,
      color:               getColorName(activeColor),
      yarnType:            selectedYarn,
      size:                size,
      customText:          customText,
      recipientName:       recipientName,
      occasion:            occasion,
      specialInstructions: specialInstructions,
      giftWrap:            giftWrap,
      quantity:            quantity,
      referenceImages:     images.map((img) => img.url),
    };

    setLoading(true);
    try {
      // ── POST with Authorization header (Bearer token) ──────────────────
      const res = await fetch(`${BASE_URL}/create`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${userToken}`,   // ✅ AuthContext userToken
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // ── Handle 401 Unauthorized specifically ────────────────────────────
      if (res.status === 401) {
        showToast("error", "Session expired. Please log in again.");
        // Optional: clear stale storage & redirect
        // localStorage.removeItem("token");
        // localStorage.removeItem("user");
        // navigate("/login");
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Something went wrong. Please try again.");
      }

      // data.data = newCustomization (Mongoose document)
      setOrderData(data.data);
      showToast("success", data.message ?? "Your crochet order is placed! 🧶");

    } catch (err) {
      showToast("error", err.message ?? "Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customized-customize-order-page">
      <div className="customized-customize-order-container">

        {/* ── Header with My Orders button ────────────────────────────────── */}
        <div className="customized-customize-header">
          <span className="customized-header-icon">🧶</span>
          <div style={{ flex: 1 }}>
            <h2>Customize Your Crochet Order</h2>
            <p>Every stitch made just for you — share your vision below!</p>
          </div>
          <button
            className="customized-my-orders-btn"
            onClick={() => navigate("/myCustomeorders")}
            type="button"
          >
            📋 My Orders
          </button>
        </div>

        {/* ── Order Confirmation Card ──────────────────────────────────────── */}
        {orderData && (
          <div className="customized-order-confirm-card">
            <div className="customized-confirm-card-header">
              <span className="customized-confirm-check">✅</span>
              <div>
                <h4>Order Placed Successfully!</h4>
                <p>We'll review and get back to you within 24 hours.</p>
              </div>
              <button className="customized-confirm-close-btn" onClick={() => setOrderData(null)}>×</button>
            </div>

            <div className="customized-confirm-grid">
              <ConfirmRow label="Order ID"    value={<span className="customized-mono">{orderData._id}</span>} />
              <ConfirmRow label="Customer"    value={orderData.customerName} />
              <ConfirmRow label="Email"       value={orderData.customerEmail} />
              <ConfirmRow label="Item Type"   value={orderData.itemType} />
              <ConfirmRow label="Color"       value={orderData.color} />
              <ConfirmRow label="Yarn Type"   value={orderData.yarnType  || "—"} />
              <ConfirmRow label="Size"        value={orderData.size       || "—"} />
              <ConfirmRow label="Custom Text" value={orderData.customText || "—"} />
              <ConfirmRow label="Recipient"   value={orderData.recipientName || "—"} />
              <ConfirmRow label="Occasion"    value={orderData.occasion   || "—"} />
              <ConfirmRow label="Quantity"    value={orderData.quantity} />
              <ConfirmRow label="Gift Wrap"   value={orderData.giftWrap ? "Yes 🎁" : "No"} />
              {orderData.specialInstructions && (
                <ConfirmRow label="Instructions" value={orderData.specialInstructions} full />
              )}
              <ConfirmRow
                label="Status"
                value={<span className="customized-status-pill customized-pill-pending">{orderData.status}</span>}
              />
              <ConfirmRow
                label="Submitted At"
                value={new Date(orderData.createdAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                full
              />
            </div>

            <div className="customized-confirm-action-row">
              <button className="customized-new-order-btn customized-outline" onClick={handleReset}>
                + Place Another Order
              </button>
              <button
                className="customized-new-order-btn"
                onClick={() => navigate("/myCustomeorders")}
              >
                📋 View My Orders
              </button>
            </div>
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────────────────── */}
        {!orderData && (
          <>
            <div className="customized-product-preview-card">
              <div className="customized-product-info">
                <h4>{SAMPLE_PRODUCT.name}</h4>
                <p>{SAMPLE_PRODUCT.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              {/* Item Type */}
              <div className="customized-form-section">
                <label>What would you like? <span className="customized-required">*</span></label>
                <div className="customized-size-options" style={{ flexWrap: "wrap" }}>
                  {ITEM_TYPES.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={`customized-size-btn ${selectedItem === item ? "customized-selected" : ""}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="customized-form-section">
                <label>Choose Yarn Color <span className="customized-required">*</span></label>
                <div className="customized-color-options">
                  {COLOR_SWATCHES.map((c) => (
                    <div
                      key={c.hex}
                      className={`customized-color-swatch ${selectedColor === c.hex ? "customized-selected" : ""}`}
                      style={{ backgroundColor: c.hex, border: "2px solid #e8ddd5" }}
                      title={c.name}
                      onClick={() => setSelectedColor(c.hex)}
                    />
                  ))}
                </div>

                {(selectedColor || customColor) && (
                  <div className="customized-selected-color-label">
                    Selected:&nbsp;
                    <span
                      className="customized-color-name-dot"
                      style={{ backgroundColor: selectedColor || customColor }}
                    />
                    <strong>{getColorName(selectedColor || customColor)}</strong>
                  </div>
                )}

                <div className="customized-color-custom-input">
                  <input
                    type="color"
                    id="hiddenColorPicker"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    style={{ display: "none" }}
                  />
                  <div
                    className="customized-custom-color-trigger"
                    style={{ backgroundColor: customColor }}
                    onClick={() => document.getElementById("hiddenColorPicker").click()}
                    title="Pick a custom color"
                  >
                    <span>＋</span>
                  </div>
                  <span>
                    Custom:{" "}
                    <strong style={{ color: customColor }}>{customColor.toUpperCase()}</strong>
                  </span>
                </div>
              </div>

              {/* Yarn Type */}
              <div className="customized-form-section">
                <label>Yarn Type / Material</label>
                <div className="customized-size-options">
                  {YARN_TYPES.map((y) => (
                    <button
                      type="button"
                      key={y}
                      className={`customized-size-btn ${selectedYarn === y ? "customized-selected" : ""}`}
                      onClick={() => setSelectedYarn(y)}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="customized-form-section">
                <label>Size or Dimensions</label>
                <input
                  type="text"
                  className="customized-custom-input"
                  placeholder='e.g. "Small (fits 2–3 yr old)", "30×30 cm", "Adult M"'
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>

              {/* Custom Text */}
              <div className="customized-form-section">
                <label>Custom Text / Name on Item</label>
                <input
                  type="text"
                  className="customized-custom-input"
                  placeholder='e.g. "Baby Arya", "Love, Mom", initials...'
                  value={customText}
                  maxLength={60}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>

              {/* Recipient + Occasion */}
              <div className="customized-form-section customized-two-col">
                <div>
                  <label>Recipient's Name</label>
                  <input
                    type="text"
                    className="customized-custom-input"
                    placeholder='e.g. "For my daughter"'
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label>Occasion / Event Type</label>
                  <select
                    className="customized-custom-input customized-custom-select"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  >
                    <option value="">Select occasion…</option>
                    {EVENT_OPTIONS.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference Images */}
              <div className="customized-form-section">
                <label>
                  Reference Images
                  <span className="customized-label-note"> (max 5) — share inspiration photos!</span>
                </label>
                <label className="customized-image-upload-area" htmlFor="refImages">
                  <span className="customized-upload-icon">🖼️</span>
                  <p><strong>Click to upload</strong> or drag & drop</p>
                  <p>Share Pinterest photos, design ideas, color references...</p>
                  <input
                    id="refImages"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </label>
                {images.length > 0 && (
                  <div className="customized-image-preview-grid">
                    {images.map((img, i) => (
                      <div className="customized-preview-thumb" key={i}>
                        <img src={img.url} alt={`ref-${i}`} />
                        <button type="button" className="customized-remove-img" onClick={() => removeImage(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="customized-form-section">
                <label>Special Instructions / Design Preference</label>
                <textarea
                  className="customized-custom-textarea"
                  rows={4}
                  placeholder="Stitch pattern, looseness/tightness, allergies (e.g. wool-free), packaging notes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Quantity + Gift Wrap */}
              <div className="customized-form-section customized-qty-gift-row">
                <div>
                  <label>Quantity</label>
                  <div className="customized-quantity-control">
                    <button type="button" className="customized-qty-btn" onClick={() => handleQty("dec")}>−</button>
                    <div className="customized-qty-value">{quantity}</div>
                    <button type="button" className="customized-qty-btn" onClick={() => handleQty("inc")}>+</button>
                  </div>
                </div>
                <div className="customized-gift-wrap-toggle">
                  <input
                    type="checkbox"
                    id="giftWrap"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                  />
                  <label htmlFor="giftWrap">🎁 Add Gift Wrapping</label>
                </div>
              </div>

              {/* Submit Row */}
              <div className="customized-submit-row">
                <button type="button" className="customized-cancel-btn" onClick={handleReset} disabled={loading}>
                  Reset
                </button>
                <button type="submit" className="customized-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="customized-btn-loading">
                      <span className="customized-spinner" /> Submitting…
                    </span>
                  ) : (
                    "🧶 Submit Customization"
                  )}
                </button>
              </div>

            </form>
          </>
        )}
      </div>

      {toast && (
        <div className={`customized-toast customized-toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

const ConfirmRow = ({ label, value, full }) => (
  <div className={`customized-confirm-row ${full ? "customized-full" : ""}`}>
    <span className="customized-confirm-label">{label}</span>
    <span className="customized-confirm-value">{value}</span>
  </div>
);