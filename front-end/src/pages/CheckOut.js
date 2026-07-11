import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { jwtDecode } from "jwt-decode";
import "../styless/checkout.css";

const BASE_URL = "http://localhost:5000/";

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded._id || decoded.id || decoded.userId || null;
  } catch { return null; }
};

export default function CheckOut() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { userToken } = useContext(AuthContext);
  const userId        = getUserIdFromToken(userToken);

  const buyNowItem = location.state?.buyNow || null;

  const [cart,         setCart]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [error,        setError]        = useState(null);

  const [form, setForm] = useState({
    firstName:    "",
    lastName:     "",
    email:        "",
    phone:        "",
    address:      "",
    city:         "",
    state:        "Gujarat",
    pinCode:      "",
    customerNote: "",   // ✅ added
  });
  const [formErrors, setFormErrors] = useState({});

  const [coupon,        setCoupon]        = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg,     setCouponMsg]     = useState("");

  const DELIVERY_CHARGE = 0; // change to e.g. 50 if you want to charge delivery

  // ── Fetch Cart or use Buy Now ─────────────────────────────────────
  useEffect(() => {
    if (!userId) { navigate("/login"); return; }
    if (buyNowItem) {
      setCart([buyNowItem]);
      setLoading(false);
    } else {
      fetchCart();
    }
  }, [userId]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${BASE_URL}api/cart/getUserCart/${userId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (data?.products) {
        const mapped = data.products.map(item => ({
          productId: item.productId._id,
          variantId: item.variantId || null,
          name:      item.productId.productName,
          price:     item.productId.basePrice,
          quantity:  item.quantity,
          img: item.productId.images?.[0]
            ? `${BASE_URL}${item.productId.images[0].replace(/\\/g, "/")}`
            : "/no-image.png",
        }));
        setCart(mapped);
      }
    } catch {
      setError("Failed to load cart.");
    } finally {
      setLoading(false);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────
  const subtotal       = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const discountAmount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const tax            = Math.round((subtotal - discountAmount) * 0.08);
  const deliveryCharge = DELIVERY_CHARGE;
  const total          = subtotal - discountAmount + tax + deliveryCharge;
  const totalStr       = total.toLocaleString("en-IN");

  // ── Form Validation ───────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = "Required";
    if (!form.lastName.trim())  errors.lastName  = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errors.email = "Valid email required";
    if (!form.phone.trim() || form.phone.length < 10) errors.phone = "Valid phone required";
    if (!form.address.trim()) errors.address = "Required";
    if (!form.city.trim())    errors.city    = "Required";
    if (!form.pinCode.trim() || form.pinCode.length < 6) errors.pinCode = "Valid pincode required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Place Order API ───────────────────────────────────────────────
  const placeOrderAPI = async () => {
    setOrderPlacing(true);
    try {
      const orderData = {
        // ✅ matches orderSchema field "user"
        user:   userId,
        userId: userId,

        // ✅ deliveryAddress — matches your schema exactly
        deliveryAddress: {
          fullName:   `${form.firstName} ${form.lastName}`.trim(),
          phone:      form.phone,
          street:     form.address,
          city:       form.city,
          state:      form.state,
          postalCode: form.pinCode,
          country:    "India",
        },

        // fallback key some controllers use
        shippingAddress: {
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          phone:     form.phone,
          address:   form.address,
          city:      form.city,
          state:     form.state,
          pinCode:   form.pinCode,
        },

        // ✅ orderItems — matches orderItemSchema
        orderItems: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          name:      item.name,
          quantity:  item.quantity,
          price:     item.price,
        })),

        // fallback key some controllers use
        products: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity:  item.quantity,
          price:     item.price,
        })),

        // ✅ Pricing — all schema fields
        subtotal,
        discountAmount,
        deliveryCharge,
        totalAmount:  total,
        total,
        paidAmount:   0,

        // ✅ Coupon
        couponCode: couponApplied ? coupon : "",

        // ✅ Payment — pending, will be updated after payment page
        paymentMethod:  "cod",
        paymentStatus:  "pending",
        transactionId:  "",

        // ✅ Customer Note
        customerNote: form.customerNote.trim(),

        orderStatus: "pending",
        isBuyNow:    !!buyNowItem,
      };

      const res  = await fetch(`${BASE_URL}api/orders/placeOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${userToken}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order placement failed");

      const newOrderId = data.order?._id || data._id;
      if (!newOrderId) throw new Error("No order ID returned from server");

      return newOrderId;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setOrderPlacing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    if (cart.length === 0) { setError("Your cart is empty!"); return; }

    const newOrderId = await placeOrderAPI();
    if (!newOrderId) return; 

    // ✅ Pass full pricing breakdown to payment page
    navigate(`/payment/${newOrderId}?type=full`, {
      state: {
        userId,
        amount:         total,
        subtotal,
        discountAmount,
        deliveryCharge,
        tax,
        customerNote:   form.customerNote.trim(),
        couponCode:     couponApplied ? coupon : "",
        isBuyNow:       !!buyNowItem,
        cartItems:      buyNowItem ? [] : cart.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
        })),
      }
    });
  };

  const handleCoupon = () => {
    if (coupon.toLowerCase() === "save10") {
      setCouponApplied(true);
      setCouponMsg("✅ Coupon applied! You saved 10%");
    } else {
      setCouponMsg("❌ Invalid coupon code");
    }
    setTimeout(() => setCouponMsg(""), 3000);
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const inputClass = (k) => `co-input ${formErrors[k] ? "co-input-err" : ""}`;

  if (loading) return (
    <div className="co-loading">
      <div className="co-spinner" />
      <p>Loading checkout…</p>
    </div>
  );

  return (
    <div className="co-wrapper">

      {/* Header */}
      <div className="co-header">
        <div className="co-header-inner">
          <button className="co-back-link" onClick={() => navigate(buyNowItem ? -1 : "/Cart")}>
            ← {buyNowItem ? "Back" : "Back to Cart"}
          </button>
          <h1 className="co-header-title">🔒 Secure Checkout</h1>
          <div className="co-steps">
            <span className="co-step active">Cart</span>
            <span className="co-step-line" />
            <span className="co-step active">Checkout</span>
            <span className="co-step-line" />
            <span className="co-step">Payment</span>
          </div>
        </div>
      </div>

      <div className="co-body">
        <div className="co-grid">

          {/* ──── LEFT ──── */}
          <div className="co-left">
            {error && <div className="co-error-banner">⚠️ {error}</div>}

            {/* Shipping Info */}
            <div className="co-card">
              <h2 className="co-card-title">📦 Shipping Information</h2>
              <div className="co-form-row">
                <div className="co-field">
                  <label>First Name <span>*</span></label>
                  <input className={inputClass("firstName")} placeholder="Raj" value={form.firstName} onChange={f("firstName")} />
                  {formErrors.firstName && <span className="co-err-msg">{formErrors.firstName}</span>}
                </div>
                <div className="co-field">
                  <label>Last Name <span>*</span></label>
                  <input className={inputClass("lastName")} placeholder="Patel" value={form.lastName} onChange={f("lastName")} />
                  {formErrors.lastName && <span className="co-err-msg">{formErrors.lastName}</span>}
                </div>
              </div>
              <div className="co-form-row">
                <div className="co-field">
                  <label>Email <span>*</span></label>
                  <input className={inputClass("email")} type="email" placeholder="raj@email.com" value={form.email} onChange={f("email")} />
                  {formErrors.email && <span className="co-err-msg">{formErrors.email}</span>}
                </div>
                <div className="co-field">
                  <label>Phone <span>*</span></label>
                  <input className={inputClass("phone")} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={f("phone")} />
                  {formErrors.phone && <span className="co-err-msg">{formErrors.phone}</span>}
                </div>
              </div>
              <div className="co-form-row co-single">
                <div className="co-field">
                  <label>Street Address <span>*</span></label>
                  <input className={inputClass("address")} placeholder="123, MG Road, Near City Mall" value={form.address} onChange={f("address")} />
                  {formErrors.address && <span className="co-err-msg">{formErrors.address}</span>}
                </div>
              </div>
              <div className="co-form-row co-triple">
                <div className="co-field">
                  <label>City <span>*</span></label>
                  <input className={inputClass("city")} placeholder="Surat" value={form.city} onChange={f("city")} />
                  {formErrors.city && <span className="co-err-msg">{formErrors.city}</span>}
                </div>
                <div className="co-field">
                  <label>State</label>
                  <select className="co-input" value={form.state} onChange={f("state")}>
                    <option>Gujarat</option>
                    <option>Maharashtra</option>
                    <option>Rajasthan</option>
                    <option>Delhi</option>
                    <option>Karnataka</option>
                    <option>Tamil Nadu</option>
                  </select>
                </div>
                <div className="co-field">
                  <label>Pin Code <span>*</span></label>
                  <input className={inputClass("pinCode")} placeholder="395001" maxLength="6" value={form.pinCode} onChange={f("pinCode")} />
                  {formErrors.pinCode && <span className="co-err-msg">{formErrors.pinCode}</span>}
                </div>
              </div>
            </div>

            {/* ✅ Customer Note Card */}
            <div className="co-card" style={{ marginTop: "16px" }}>
              <h2 className="co-card-title">
                📝 Order Note{" "}
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#94a3b8" }}>(Optional)</span>
              </h2>
              <div className="co-field">
                <label>Special Instructions / Note for Seller</label>
                <textarea
                  className="co-input"
                  placeholder="e.g. Please pack carefully, gift wrapping needed, leave at door..."
                  value={form.customerNote}
                  onChange={f("customerNote")}
                  rows={3}
                  style={{ resize: "vertical", minHeight: "80px" }}
                />
              </div>
            </div>

            {/* Payment info note */}
            <div className="co-card" style={{ marginTop: "16px" }}>
              <div style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                padding: "14px 16px",
                background: "#f0f9ff", border: "1px solid #bae6fd",
                borderRadius: "10px",
              }}>
                <span style={{ fontSize: "20px" }}>💳</span>
                <div>
                  <p style={{ fontWeight: 600, color: "#0369a1", margin: "0 0 4px", fontSize: "14px" }}>
                    Payment on Next Step
                  </p>
                  <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                    After placing your order, you will be redirected to the secure payment page where you can pay via UPI, Net Banking, or Cash on Delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ──── RIGHT ──── */}
          <div className="co-right">
            <div className="co-summary">
              <h2 className="co-summary-title">Order Summary</h2>

              {/* Cart Items */}
              <div className="co-items-list">
                {cart.map((item, idx) => (
                  <div key={idx} className="co-item-row">
                    <img src={item.img} alt={item.name} className="co-item-img" />
                    <div className="co-item-info">
                      <p className="co-item-name">{item.name}</p>
                      <p className="co-item-qty">Qty: {item.quantity}</p>
                    </div>
                    <p className="co-item-price">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="co-coupon-row">
                <input
                  className="co-coupon-input"
                  placeholder="Coupon code (try: SAVE10)"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                />
                <button className="co-coupon-btn" onClick={handleCoupon}>Apply</button>
              </div>
              {couponMsg && (
                <p className={`co-coupon-msg ${couponApplied ? "co-coupon-ok" : "co-coupon-fail"}`}>
                  {couponMsg}
                </p>
              )}

              {/* ✅ Full Totals Breakdown */}
              <div className="co-totals">
                <div className="co-total-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {couponApplied && (
                  <div className="co-total-row co-discount-row">
                    <span>Discount (10%)</span>
                    <span style={{ color: "#16a34a", fontWeight: 600 }}>
                      −₹{discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="co-total-row">
                  <span>Delivery Charges</span>
                  <span className={deliveryCharge === 0 ? "co-free" : ""}>
                    {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge.toLocaleString("en-IN")}`}
                  </span>
                </div>
                <div className="co-total-row">
                  <span>GST (8%)</span>
                  <span>₹{tax.toLocaleString("en-IN")}</span>
                </div>
                <hr className="co-divider" />
                <div className="co-total-row co-grand">
                  <span>Total</span>
                  <span>₹{totalStr}</span>
                </div>
              </div>

              <button
                className="co-place-btn"
                onClick={handlePlaceOrder}
                disabled={orderPlacing || cart.length === 0}
              >
                {orderPlacing ? (
                  <><span className="co-btn-spinner" /> Processing…</>
                ) : (
                  `Proceed to Pay → ₹${totalStr}`
                )}
              </button>
              <p className="co-secure-note">🔒 100% Secure &amp; Encrypted Checkout</p>
              <div className="co-trust-badges">
                <span>✓ Easy Returns</span>
                <span>✓ Cash on Delivery</span>
                <span>✓ Handmade with Love</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}