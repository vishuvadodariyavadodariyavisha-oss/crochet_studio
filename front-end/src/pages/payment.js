import { useState, useEffect, useContext, useCallback} from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { jwtDecode } from "jwt-decode";
import "../styless/payment.css";

// const BASE_URL        = "http://localhost:5000/";
const BASE_CUSTOM_URL = "http://localhost:5000/api/customization";
const BASE_BULK_URL   = "http://localhost:5000/api/bulkorders";
const PAYMENT_API     = "http://localhost:5000/api/payment";
const ORDER_API       = "http://localhost:5000/api/orders";
const CART_API        = "http://localhost:5000/api/cart";

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded._id || decoded.id || decoded.userId || null;
  } catch { return null; }
};

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id ?? "");
const safeOrderId     = (id) => (id ? `#${String(id).slice(-12).toUpperCase()}` : "—");
const inr             = (n)  => Number(n || 0).toLocaleString("en-IN");

const PAYMENT_TYPE_CONFIG = {
  full:      { label: "Full Payment",     percent: 100, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" },
  advance70: { label: "Advance (70%)",    percent: 70,  color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "💛" },
  advance:   { label: "Advance (50%)",    percent: 50,  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: "💜" },
  remaining: { label: "Remaining Amount", percent: null, color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: "🔵" },
  cod30:     { label: "COD (30%)",        percent: 30,  color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", icon: "🟠" },
};

const PAYMENT_METHODS = [
  { id: "upi",     label: "UPI",              icon: "📱", desc: "Google Pay, PhonePe, Paytm" },
  { id: "netbank", label: "Net Banking",      icon: "🏦", desc: "All major banks" },
  { id: "cod",     label: "Cash on Delivery", icon: "💵", desc: "Pay when you receive" },
];

const UPI_APPS = [
  { id: "gpay",    label: "Google Pay", icon: "🔵" },
  { id: "phonepe", label: "PhonePe",    icon: "🟣" },
  { id: "paytm",   label: "Paytm",      icon: "🔷" },
  { id: "other",   label: "Other UPI",  icon: "📲" },
];

// ── PDF Download Function using jsPDF (no external library needed) ─────────────
const downloadReceiptAsPDF = async (receiptData) => {
  // Dynamically load jsPDF from CDN
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW  = 210;
  const margin = 20;
  const colW   = pageW - margin * 2;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setFont = (style = "normal", size = 10) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const setColor = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    doc.setTextColor(r, g, b);
  };
  const setFill = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    doc.setFillColor(r, g, b);
  };
  const setDraw = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    doc.setDrawColor(r, g, b);
  };

  let y = 0;

  // ── HEADER ───────────────────────────────────────────────────────────────────
  setFill("#3b1f0e");
  doc.rect(0, 0, pageW, 38, "F");

  setFont("bold", 20);
  setColor("#f5e6d3");
  doc.text("🧶 Crochet Shop", margin, 16);

  setFont("normal", 9);
  setColor("#d4a574");
  doc.text("Handcrafted with Love", margin, 23);

  setFont("bold", 13);
  setColor("#ffffff");
  doc.text("PAYMENT RECEIPT", pageW - margin, 14, { align: "right" });

  setFont("normal", 8);
  setColor("#d4a574");
  doc.text("Official Receipt", pageW - margin, 21, { align: "right" });

  // Paid badge
  setFill("#15803d");
  doc.roundedRect(pageW - margin - 24, 25, 24, 8, 2, 2, "F");
  setFont("bold", 8);
  setColor("#ffffff");
  doc.text("✓ PAID", pageW - margin - 12, 30.5, { align: "center" });

  y = 48;

  // ── TRANSACTION & ORDER INFO ──────────────────────────────────────────────────
  // Two column boxes
  const boxH = 24;
  const halfW = (colW - 6) / 2;

  // Left box — Transaction ID
  setFill("#f8f4f0");
  setDraw("#e8d5c4");
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, halfW, boxH, 3, 3, "FD");

  setFont("normal", 7);
  setColor("#9b7a5e");
  doc.text("TRANSACTION ID", margin + 4, y + 6);
  setFont("bold", 9);
  setColor("#3b1f0e");
  const txnId = receiptData.transactionId ?? "—";
  // wrap long txnId
  if (txnId.length > 20) {
    doc.text(txnId.slice(0, 20), margin + 4, y + 13);
    doc.text(txnId.slice(20), margin + 4, y + 19);
  } else {
    doc.text(txnId, margin + 4, y + 14);
  }

  // Right box — Order ID
  const rx = margin + halfW + 6;
  setFill("#f8f4f0");
  doc.roundedRect(rx, y, halfW, boxH, 3, 3, "FD");

  setFont("normal", 7);
  setColor("#9b7a5e");
  doc.text("ORDER ID", rx + 4, y + 6);
  setFont("bold", 9);
  setColor("#3b1f0e");
  doc.text(receiptData.orderId ?? "—", rx + 4, y + 14);

  y += boxH + 8;

  // Date + Method row
  setFont("normal", 7);
  setColor("#9b7a5e");
  doc.text("DATE & TIME", margin, y);
  doc.text("PAYMENT METHOD", margin + halfW + 6, y);
  y += 5;
  setFont("bold", 9);
  setColor("#3b1f0e");
  doc.text(receiptData.dateTime ?? "—", margin, y);
  doc.text(receiptData.paymentMethod ?? "—", margin + halfW + 6, y);

  y += 12;

  // ── DIVIDER ───────────────────────────────────────────────────────────────────
  setDraw("#e8d5c4");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── ITEMS ────────────────────────────────────────────────────────────────────
  setFont("bold", 9);
  setColor("#9b7a5e");
  doc.text("ORDER DETAILS", margin, y);
  y += 6;

  setFill("#f8f4f0");
  setDraw("#e8d5c4");
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colW, 14, 2, 2, "FD");

  setFont("bold", 10);
  setColor("#3b1f0e");
  const itemName = receiptData.itemType ?? "Crochet Order";
  doc.text(itemName.length > 55 ? itemName.slice(0, 52) + "..." : itemName, margin + 4, y + 6);
  setFont("normal", 8);
  setColor("#7a5c40");
  doc.text(`Qty: ${receiptData.quantity ?? 1}`, margin + 4, y + 11);

  y += 22;

  // ── PRICE BREAKDOWN ───────────────────────────────────────────────────────────
  setFont("bold", 9);
  setColor("#9b7a5e");
  doc.text("PRICE BREAKDOWN", margin, y);
  y += 7;

  const drawBreakdownRow = (label, value, bold = false, valueColor = "#3b1f0e") => {
    setFont(bold ? "bold" : "normal", 9);
    setColor("#5c4030");
    doc.text(label, margin, y);

    const vr = parseInt(valueColor.slice(1,3),16);
    const vg = parseInt(valueColor.slice(3,5),16);
    const vb = parseInt(valueColor.slice(5,7),16);
    doc.setTextColor(vr, vg, vb);
    setFont(bold ? "bold" : "normal", 9);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 6;
  };

  if (receiptData.subtotal && receiptData.subtotal !== receiptData.totalAmount) {
    drawBreakdownRow("Subtotal", `₹${inr(receiptData.subtotal)}`);
  }
  if (receiptData.discountAmount > 0) {
    drawBreakdownRow(
      `Discount${receiptData.couponCode ? ` (${receiptData.couponCode})` : ""}`,
      `−₹${inr(receiptData.discountAmount)}`,
      false,
      "#15803d"
    );
  }
  drawBreakdownRow(
    "Delivery Charges",
    receiptData.deliveryCharge === 0 ? "FREE" : `₹${inr(receiptData.deliveryCharge)}`,
    false,
    receiptData.deliveryCharge === 0 ? "#15803d" : "#3b1f0e"
  );
  if (receiptData.tax > 0) {
    drawBreakdownRow("GST (8%)", `₹${inr(receiptData.tax)}`);
  }

  // Total line
  y += 2;
  setDraw("#3b1f0e");
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  setFill("#3b1f0e");
  doc.roundedRect(margin, y - 4, colW, 12, 2, 2, "F");
  setFont("bold", 11);
  setColor("#ffffff");
  doc.text("AMOUNT PAID", margin + 4, y + 4);
  doc.text(`₹${inr(receiptData.amountPaid)}`, pageW - margin - 4, y + 4, { align: "right" });
  y += 16;

  // ── CUSTOMER NOTE ─────────────────────────────────────────────────────────────
  if (receiptData.customerNote) {
    setFill("#fffbeb");
    setDraw("#fde68a");
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colW, 16, 2, 2, "FD");
    setFont("bold", 8);
    setColor("#92400e");
    doc.text("NOTE:", margin + 4, y + 6);
    setFont("normal", 8);
    const noteLines = doc.splitTextToSize(receiptData.customerNote, colW - 20);
    doc.text(noteLines, margin + 20, y + 6);
    y += 22;
  }

  // ── STATUS BANNER ─────────────────────────────────────────────────────────────
  setFill("#f0fdf4");
  setDraw("#bbf7d0");
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colW, 12, 2, 2, "FD");
  setFont("bold", 9);
  setColor("#15803d");
  doc.text("✓  Payment Successful — Thank you for your order!", margin + colW / 2, y + 7, { align: "center" });
  y += 20;

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  setDraw("#e8d5c4");
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  setFont("normal", 7);
  setColor("#9b7a5e");
  doc.text("This is a computer-generated receipt and does not require a signature.", pageW / 2, y, { align: "center" });
  y += 5;
  doc.text("For queries, contact us at support@crochetshop.in", pageW / 2, y, { align: "center" });
  y += 5;
  doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, pageW / 2, y, { align: "center" });

  // ── SAVE ──────────────────────────────────────────────────────────────────────
  const filename = `Receipt_${receiptData.transactionId ?? receiptData.orderId ?? "payment"}.pdf`;
  doc.save(filename);
};

export default function PaymentPage() {
  const params         = useParams();
  const orderId        = params.orderId ?? params.id;
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const location       = useLocation();

  const { userToken } = useContext(AuthContext);
  const userId = getUserIdFromToken(userToken);

  const rawType = searchParams.get("type") ?? "full";
  const isBulk  = rawType === "bulk";
  const payType = isBulk ? (searchParams.get("paymentType") ?? "full") : rawType;

  const stateAmount       = location.state?.amount         ?? null;
  const stateSubtotal     = location.state?.subtotal       ?? null;
  const stateDiscountAmt  = location.state?.discountAmount ?? 0;
  const stateDelivery     = location.state?.deliveryCharge ?? 0;
  const stateTax          = location.state?.tax            ?? 0;
  const stateCustomerNote = location.state?.customerNote   ?? "";
  const stateCouponCode   = location.state?.couponCode     ?? "";
  const isBuyNow          = location.state?.isBuyNow       ?? false;
  const cartItems         = location.state?.cartItems      ?? [];

  const [order,        setOrder]        = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError,   setOrderError]   = useState(null);

  const [selectedMethod, setSelectedMethod] = useState("cod");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId,          setUpiId]          = useState("");
  const [selectedBank,   setSelectedBank]   = useState("");
  const [agreedToTerms,  setAgreedToTerms]  = useState(false);

  const [step,           setStep]          = useState("details");
  const [processing,     setProcessing]    = useState(false);
  const [paymentResult,  setPaymentResult] = useState(null);
  const [toast,          setToast]         = useState(null);
  const [pdfLoading,     setPdfLoading]    = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (!userId) { navigate("/login"); return; }
    if (!orderId) { setOrderError("Order ID is missing."); setLoadingOrder(false); return; }
    if (!isValidObjectId(orderId)) {
      setOrderError(`Invalid Order ID: "${orderId}" (${orderId.length} chars, expected 24).`);
      setLoadingOrder(false);
      return;
    }
    fetchOrder();
  }, [fetchOrder, navigate, orderId, userId]);

  const fetchOrder =useCallback( async () => {
    setLoadingOrder(true);
    setOrderError(null);
    try {
      let raw;

      if (isBulk) {
        const res  = await fetch(`${BASE_BULK_URL}/getBulkOrderById/${orderId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.message || "Bulk order not found.");
        const r = data.data ?? data.bulkOrder ?? data;
        raw = {
          _id: r._id, orderModel: "BulkOrder",
          itemType:      r.productId?.productName ?? r.productType ?? "Bulk Crochet Item",
          quantity:      r.quantity   ?? 1,
          color:         r.primaryColor ?? r.colorNotes ?? "—",
          yarnType:      Array.isArray(r.yarnColors) && r.yarnColors.length > 0 ? r.yarnColors.join(", ") : null,
          totalAmount:   Number(r.quotedPrice ?? r.finalAmount ?? 0),
          paidAmount:    Number(r.paidAmount ?? 0),
          subtotal:      Number(r.quotedPrice ?? r.finalAmount ?? 0),
          discountAmount: 0, deliveryCharge: 0,
          status:        r.status ?? "requested",
          eventType:     r.eventType ?? null,
          orderNumber:   r.orderNumber ?? null,
          customerNote:  "", couponCode: "", giftWrap: false, orderItems: [],
        };
      } else {
        const res     = await fetch(`${ORDER_API}/getOrderById/${orderId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const rawText = await res.text();
        let data;
        try { data = JSON.parse(rawText); }
        catch { throw new Error(`Invalid JSON from server.`); }

        const r = data.data ?? data.order ?? (data._id ? data : null);

        if (res.ok && r?._id) {
          const items = r.orderItems ?? r.products ?? [];
          raw = {
            _id: r._id, orderModel: "Order",
            itemType:      items.length > 0 ? items.map(p => p.productId?.productName ?? p.name ?? "Item").join(", ") : "Shop Order",
            quantity:      items.reduce((s, p) => s + (p.quantity ?? 1), 0) || 1,
            color: "—", yarnType: null,
            totalAmount:   Number(stateAmount     ?? r.totalAmount    ?? r.total ?? 0),
            paidAmount:    Number(r.paidAmount     ?? 0),
            subtotal:      Number(stateSubtotal    ?? r.subtotal       ?? 0),
            discountAmount:Number(stateDiscountAmt ?? r.discountAmount ?? 0),
            deliveryCharge:Number(stateDelivery    ?? r.deliveryCharge ?? 0),
            giftWrap: false,
            status:        r.orderStatus ?? r.status ?? "pending",
            eventType: null, orderNumber: r.orderNumber ?? null,
            customerNote:  stateCustomerNote || r.customerNote || "",
            couponCode:    stateCouponCode   || r.couponCode   || "",
            orderItems:    items,
          };
        } else {
          let cRes, cData;
          cRes  = await fetch(`${BASE_CUSTOM_URL}/getOne/${orderId}`, { headers: { Authorization: `Bearer ${userToken}` } });
          cData = await cRes.json();
          if (!cRes.ok || !cData.success) {
            cRes  = await fetch(`${BASE_CUSTOM_URL}/getByOrderId/${orderId}`, { headers: { Authorization: `Bearer ${userToken}` } });
            cData = await cRes.json();
          }
          if (!cRes.ok || !cData.success) throw new Error(data?.message ?? cData?.message ?? `Order not found.`);
          const cr = cData.data ?? cData.order ?? cData;
          raw = {
            _id: cr._id, orderModel: "Customization",
            itemType: cr.itemType ?? "Custom Crochet Item",
            quantity: cr.quantity ?? 1, color: cr.color ?? "—", yarnType: cr.yarnType ?? null,
            totalAmount:   Number(stateAmount ?? cr.totalAmount ?? cr.price ?? 0),
            paidAmount:    Number(cr.paidAmount ?? 0),
            subtotal:      Number(stateAmount ?? cr.totalAmount ?? cr.price ?? 0),
            discountAmount: 0, deliveryCharge: 0,
            giftWrap: cr.giftWrap ?? false, status: cr.status ?? "pending",
            eventType: null, orderNumber: null,
            customerNote: stateCustomerNote || "", couponCode: "",
            orderItems: [],
          };
        }
      }

      setOrder(raw);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setLoadingOrder(false);
    }
  }, [
  isBulk,
  orderId,
  userToken,
  stateAmount,
  stateSubtotal,
  stateDiscountAmt,
  stateDelivery,
  stateCustomerNote,
  stateCouponCode]);

  const totalAmount    = order?.totalAmount    ?? stateAmount ?? 0;
  const paidAmount     = order?.paidAmount     ?? 0;
  const subtotal       = order?.subtotal       ?? stateSubtotal ?? totalAmount;
  const discount,Amount = order?.discountAmount ?? stateDiscountAmt ?? 0;
  const deliveryCharge = order?.deliveryCharge ?? stateDelivery ?? 0;
  const customerNote   = order?.customerNote   ?? stateCustomerNote ?? "";
  const couponCode     = order?.couponCode     ?? stateCouponCode ?? "";
  const ptConfig       = PAYMENT_TYPE_CONFIG[payType] ?? PAYMENT_TYPE_CONFIG.full;

  const payableAmount = (() => {
    if (payType === "full")      return totalAmount;
    if (payType === "advance70") return Math.round(totalAmount * 0.70);
    if (payType === "advance")   return Math.round(totalAmount * 0.50);
    if (payType === "remaining") return Math.max(0, totalAmount - paidAmount);
    if (payType === "cod30")     return Math.round(totalAmount * 0.30);
    return totalAmount;
  })();

  const isFormValid = () => {
    if (!agreedToTerms) return false;
    if (selectedMethod === "upi")     return upiId.includes("@") && upiId.length > 4;
    if (selectedMethod === "netbank") return selectedBank !== "";
    if (selectedMethod === "cod")     return true;
    return false;
  };

  const handleProceed = () => {
    if (!isFormValid()) { showToast("error", "Please fill all required fields."); return; }
    setStep("confirm");
  };

  const clearCartAfterPayment = async () => {
    if (isBulk || isBuyNow || !userId) return;
    try {
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          await fetch(`${CART_API}/removeCartItem`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
            body: JSON.stringify({ userId, productId: item.productId, variantId: item.variantId }),
          });
        }
      } else {
        await fetch(`${CART_API}/clearCart/${userId}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${userToken}` },
        });
      }
    } catch (err) {
      console.warn("⚠️ Cart clear (non-blocking):", err.message);
    }
  };

  const handleConfirmPay = async () => {
    if (!userId)  { showToast("error", "Please log in again."); navigate("/login"); return; }
    if (!orderId) { showToast("error", "Order ID missing."); return; }
    if (!payableAmount || payableAmount <= 0) { showToast("error", "Invalid payment amount."); return; }

    setProcessing(true);
    try {
      const finalOrderId = order?._id?.toString() ?? orderId;
      const body = {
        orderId: finalOrderId, orderModel: order?.orderModel ?? "Order",
        paymentType: payType, paymentMethod: selectedMethod,
        amount: payableAmount, userId,
        ...(selectedMethod === "upi"     && { upiId, upiApp: selectedUpiApp }),
        ...(selectedMethod === "netbank" && { bank: selectedBank }),
      };

      const res = await fetch(`${PAYMENT_API}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body:    JSON.stringify(body),
      });

      const rawText = await res.text();
      if (res.status === 404) throw new Error("Payment API route not found (404). Register POST /api/payment/create.");

      let data;
      try { data = JSON.parse(rawText); }
      catch { throw new Error(`Server returned invalid JSON. Status: ${res.status}.`); }

      if (!res.ok || !data.success) throw new Error(data.message ?? `Payment failed (HTTP ${res.status})`);

      const result = data.data ?? data.payment ?? data;
      setPaymentResult(result);
      await clearCartAfterPayment();
      setStep("success");
      showToast("success", "Payment successful! 🎉");

    } catch (err) {
      showToast("error", err.message ?? "Payment failed.");
      setStep("details");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Download PDF Receipt
  const handleDownloadReceipt = async () => {
    setPdfLoading(true);
    try {
      await downloadReceiptAsPDF({
        transactionId:  paymentResult?.transactionId ?? paymentResult?._id ?? "—",
        orderId:        safeOrderId(order?._id ?? orderId),
        dateTime:       new Date().toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        paymentMethod:  PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label ?? selectedMethod,
        itemType:       order?.itemType ?? "Crochet Order",
        quantity:       order?.quantity ?? 1,
        subtotal,
        discountAmount,
        deliveryCharge,
        tax:            stateTax,
        couponCode,
        amountPaid:     payableAmount,
        customerNote,
      });
      showToast("success", "Receipt downloaded! 📄");
    } catch (err) {
      showToast("error", "Failed to download receipt. Please try again.");
      console.error("PDF error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="pay-page">

      <div className="pay-topbar">
        <button className="pay-back-btn" onClick={() => navigate(-1)} type="button">← Back</button>
        <div className="pay-topbar-brand"><span>🧶</span><span>Crochet Shop — Secure Payment</span></div>
        <span className="pay-secure-badge">🔒 SSL Secured</span>
      </div>

      <div className="pay-layout">
        <div className="pay-left">

          {loadingOrder && (
            <div className="pay-loading"><div className="pay-spinner" /><p>Loading order details…</p></div>
          )}

          {orderError && (
            <div className="pay-error-box">
              <span>⚠️</span>
              <div>
                <strong>Could not load order</strong>
                <p>{orderError}</p>
                <p style={{ fontSize: "12px", color: "#999", marginTop: "6px" }}>
                  Order ID: <code>{orderId ?? "undefined"}</code>{orderId && ` (${orderId.length} chars)`}
                </p>
                <button onClick={() => navigate(-1)} style={{
                  marginTop: "12px", padding: "8px 16px", background: "#3b82f6",
                  color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer",
                }}>← Go Back &amp; Try Again</button>
              </div>
            </div>
          )}

          {/* ── DETAILS ── */}
          {!loadingOrder && !orderError && step === "details" && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: "#f8fafc", border: "1.5px solid #e2e8f0",
                borderRadius: "10px", padding: "10px 16px", marginBottom: "16px",
                fontSize: "14px", color: "#475569",
              }}>
                <span>🧾</span>
                <span>Order ID:</span>
                <strong style={{ fontFamily: "monospace" }}>{safeOrderId(order?._id ?? orderId)}</strong>
                {order?.orderNumber && (
                  <span style={{ marginLeft: "auto", background: "#dbeafe", color: "#1d4ed8",
                    borderRadius: "6px", padding: "2px 10px", fontSize: "12px", fontWeight: 600 }}>
                    #{order.orderNumber}
                  </span>
                )}
              </div>

              <div style={{
                background: ptConfig.bg, border: `1.5px solid ${ptConfig.border}`,
                color: ptConfig.color, borderRadius: 10, padding: "12px 16px",
                marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15,
              }}>
                <span style={{ fontSize: 20 }}>{ptConfig.icon}</span>
                <span>
                  {ptConfig.label}
                  {payType === "remaining" ? ` — ₹${inr(payableAmount)} remaining`
                    : ptConfig.percent ? ` — ${ptConfig.percent}% of ₹${inr(totalAmount)}` : ""}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 18 }}>₹{inr(payableAmount)}</span>
              </div>

              {customerNote && (
                <div style={{
                  background: "#fffbeb", border: "1px solid #fde68a",
                  borderRadius: "10px", padding: "10px 14px", marginBottom: "16px",
                  fontSize: "13px", color: "#92400e", display: "flex", gap: "8px",
                }}>
                  <span>📝</span>
                  <div><strong>Your Note:</strong> {customerNote}</div>
                </div>
              )}

              <div className="pay-section-title"><span className="pay-step-num">1</span> Payment Method</div>

              <div className="pay-methods">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.id} type="button"
                    className={`pay-method-btn ${selectedMethod === m.id ? "pay-method-active" : ""}`}
                    onClick={() => setSelectedMethod(m.id)}>
                    <span className="pay-method-icon">{m.icon}</span>
                    <span className="pay-method-label">{m.label}</span>
                    <span className="pay-method-desc">{m.desc}</span>
                  </button>
                ))}
              </div>

              {selectedMethod === "upi" && (
                <div className="pay-form-card pay-form-fade">
                  <p className="pay-form-label">Select UPI App</p>
                  <div className="pay-upi-apps">
                    {UPI_APPS.map((app) => (
                      <button key={app.id} type="button"
                        className={`pay-upi-app ${selectedUpiApp === app.id ? "pay-upi-active" : ""}`}
                        onClick={() => setSelectedUpiApp(app.id)}>
                        <span>{app.icon}</span><span>{app.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="pay-form-label" style={{ marginTop: 14 }}>Enter UPI ID</p>
                  <input type="text" className="pay-input" placeholder="yourname@upi"
                    value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                  {upiId && !upiId.includes("@") && <span className="pay-input-hint pay-hint-error">⚠ UPI ID must contain @</span>}
                  {upiId.includes("@")             && <span className="pay-input-hint pay-hint-ok">✓ Looks good!</span>}
                </div>
              )}

              {selectedMethod === "netbank" && (
                <div className="pay-form-card pay-form-fade">
                  <p className="pay-form-label">Select Your Bank</p>
                  <select className="pay-input pay-select" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                    <option value="">-- Choose Bank --</option>
                    {["SBI","HDFC Bank","ICICI Bank","Axis Bank","Kotak Mahindra","Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank","IndusInd Bank"].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {selectedBank && <p className="pay-input-hint pay-hint-ok">✓ {selectedBank} selected.</p>}
                </div>
              )}

              {selectedMethod === "cod" && (
                <div className="pay-form-card pay-form-fade pay-cod-card">
                  <span className="pay-cod-icon">💵</span>
                  <h4>Cash on Delivery</h4>
                  <p>Pay ₹{inr(payableAmount)} in cash when your order is delivered.</p>
                  <ul className="pay-cod-points">
                    <li>✓ No online transaction needed</li>
                    <li>✓ Pay only after receiving your order</li>
                    <li>⚠ Keep exact change ready</li>
                  </ul>
                </div>
              )}

              <div className="pay-terms-row">
                <input type="checkbox" id="payTerms" checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)} />
                <label htmlFor="payTerms">
                  I agree to the <span className="pay-link">Terms &amp; Conditions</span> and confirm payment of{" "}
                  <strong>₹{inr(payableAmount)}</strong>
                </label>
              </div>

              <button className="pay-proceed-btn" type="button" disabled={!isFormValid()} onClick={handleProceed}>
                Review &amp; Pay ₹{inr(payableAmount)} →
              </button>
            </>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="pay-confirm-step pay-form-fade">
              <div className="pay-confirm-icon">🔍</div>
              <h3>Review Your Payment</h3>
              <p className="pay-confirm-sub">Please confirm the details before proceeding</p>
              <div className="pay-confirm-rows">
                <ConfirmRow label="Order ID"     value={safeOrderId(order?._id ?? orderId)} />
                <ConfirmRow label="Item"         value={order?.itemType} />
                <ConfirmRow label="Payment Type" value={ptConfig.label} />
                <ConfirmRow label="Method"       value={PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label} />
                {selectedMethod === "upi"     && <ConfirmRow label="UPI ID" value={upiId} />}
                {selectedMethod === "netbank" && <ConfirmRow label="Bank"   value={selectedBank} />}
                {customerNote && <ConfirmRow label="Note" value={customerNote} />}
                <div className="pay-confirm-amount-row">
                  <span>Amount Payable</span>
                  <strong>₹{inr(payableAmount)}</strong>
                </div>
              </div>
              <div className="pay-confirm-btns">
                <button className="pay-edit-btn" type="button" onClick={() => setStep("details")} disabled={processing}>← Edit</button>
                <button className="pay-confirm-btn" type="button" onClick={handleConfirmPay} disabled={processing}>
                  {processing
                    ? <span className="pay-btn-loading"><span className="pay-spinner-sm" /> Processing…</span>
                    : `Confirm & Pay ₹${inr(payableAmount)}`}
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div className="pay-success-step pay-form-fade">
              <div className="pay-success-anim">
                <div className="pay-success-circle"><span>✓</span></div>
              </div>
              <h3>Payment Successful!</h3>
              <p className="pay-success-sub">
                Your payment of <strong>₹{inr(payableAmount)}</strong> has been received.
              </p>

              {paymentResult && (
                <div className="pay-receipt">
                  <p className="pay-receipt-title">🧾 Payment Receipt</p>

                  <ConfirmRow label="Transaction ID" value={paymentResult.transactionId ?? paymentResult._id ?? "—"} />
                  <ConfirmRow label="Order ID"       value={safeOrderId(order?._id ?? orderId)} />
                  <ConfirmRow label="Method"         value={PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label} />
                  <ConfirmRow label="Status"         value="✅ Paid" />
                  <ConfirmRow label="Date & Time"    value={new Date().toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })} />

                  {/* Price Breakdown */}
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8",
                      letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
                      Price Breakdown
                    </p>
                    {subtotal > 0 && <ReceiptRow label="Subtotal" value={`₹${inr(subtotal)}`} />}
                    {discountAmount > 0 && (
                      <ReceiptRow label={`Discount${couponCode ? ` (${couponCode})` : ""}`}
                        value={`−₹${inr(discountAmount)}`} valueColor="#16a34a" />
                    )}
                    <ReceiptRow label="Delivery Charges"
                      value={deliveryCharge === 0 ? "FREE" : `₹${inr(deliveryCharge)}`}
                      valueColor={deliveryCharge === 0 ? "#16a34a" : undefined} />
                    {stateTax > 0 && <ReceiptRow label="GST (8%)" value={`₹${inr(stateTax)}`} />}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginTop: "10px", paddingTop: "10px", borderTop: "1.5px solid #e2e8f0",
                    }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Amount Paid</span>
                      <strong style={{ fontSize: "18px", color: "#15803d" }}>₹{inr(payableAmount)}</strong>
                    </div>
                  </div>

                  {customerNote && (
                    <div style={{
                      marginTop: "12px", padding: "10px 14px",
                      background: "#fffbeb", border: "1px solid #fde68a",
                      borderRadius: "8px", fontSize: "13px", color: "#92400e",
                    }}>
                      <strong>📝 Note:</strong> {customerNote}
                    </div>
                  )}

                  {/* ✅ DOWNLOAD PDF BUTTON */}
                  <button
                    onClick={handleDownloadReceipt}
                    disabled={pdfLoading}
                    style={{
                      width: "100%",
                      marginTop: "18px",
                      padding: "13px 20px",
                      background: pdfLoading
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 600,
                      cursor: pdfLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      boxShadow: pdfLoading ? "none" : "0 4px 12px rgba(30,41,59,0.3)",
                    }}
                  >
                    {pdfLoading ? (
                      <><span className="pay-spinner-sm" style={{ borderColor: "#fff", borderTopColor: "transparent" }} /> Generating PDF…</>
                    ) : (
                      <> 📥 Download Receipt (PDF)</>
                    )}
                  </button>
                </div>
              )}

              <div className="pay-success-actions">
                {/* {isBulk
                  ? <button className="pay-view-orders-btn" type="button" onClick={() => navigate("/bulk-order")}>📦 View Bulk Orders</button>
                  : <button className="pay-view-orders-btn" type="button" onClick={() => navigate("/MyOrders")}>📋 View My Orders</button>
                } */}
                <button className="pay-home-btn" type="button" onClick={() => navigate("/")}>🏠 Go to Home</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="pay-right">
          <div className="pay-summary-card">
            <h4 className="pay-summary-title">
              {isBulk ? "📦 Bulk Order Summary" : "🧶 Order Summary"}
            </h4>
            {loadingOrder && <div className="pay-summary-loading"><div className="pay-spinner" /></div>}
            {order && (
              <>
                <div style={{
                  background: "#f1f5f9", borderRadius: "8px", padding: "8px 12px",
                  marginBottom: "12px", fontSize: "12px", color: "#64748b",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span>🔖</span><span>Order ID:</span>
                  <code style={{ fontWeight: 700, color: "#334155" }}>{safeOrderId(order._id ?? orderId)}</code>
                </div>

                <div className="pay-summary-item-card">
                  <div className="pay-summary-item-icon">{isBulk ? "📦" : "🧶"}</div>
                  <div>
                    <p className="pay-summary-item-name">{order.itemType}</p>
                    <p className="pay-summary-item-meta">Qty: {order.quantity} · {order.color}</p>
                    {order.yarnType  && <p className="pay-summary-item-meta">Yarn: {order.yarnType}</p>}
                    {order.eventType && <p className="pay-summary-item-meta">Event: {order.eventType}</p>}
                  </div>
                </div>

                <div className="pay-type-badge" style={{
                  background: ptConfig.bg, border: `1.5px solid ${ptConfig.border}`, color: ptConfig.color,
                }}>
                  <span>{ptConfig.icon}</span><span>{ptConfig.label}</span>
                  {ptConfig.percent && <span className="pay-type-pct">{ptConfig.percent}%</span>}
                </div>

                <div className="pay-breakdown">
                  {subtotal > 0 && subtotal !== totalAmount && (
                    <div className="pay-breakdown-row"><span>Subtotal</span><span>₹{inr(subtotal)}</span></div>
                  )}
                  {discountAmount > 0 && (
                    <div className="pay-breakdown-row" style={{ color: "#16a34a" }}>
                      <span>Discount{couponCode ? ` (${couponCode})` : ""}</span>
                      <span>−₹{inr(discountAmount)}</span>
                    </div>
                  )}
                  <div className="pay-breakdown-row">
                    <span>Delivery</span>
                    <span style={{ color: deliveryCharge === 0 ? "#16a34a" : undefined, fontWeight: 600 }}>
                      {deliveryCharge === 0 ? "FREE" : `₹${inr(deliveryCharge)}`}
                    </span>
                  </div>
                  {stateTax > 0 && (
                    <div className="pay-breakdown-row"><span>GST (8%)</span><span>₹{inr(stateTax)}</span></div>
                  )}
                  {paidAmount > 0 && (
                    <div className="pay-breakdown-row pay-breakdown-paid">
                      <span>Already Paid</span><span>−₹{inr(paidAmount)}</span>
                    </div>
                  )}
                  <div className="pay-breakdown-total">
                    <span>Paying Now</span>
                    <strong>₹{inr(payableAmount)}</strong>
                  </div>
                </div>

                {customerNote && (
                  <div style={{
                    marginTop: "10px", padding: "8px 12px",
                    background: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: "8px", fontSize: "12px", color: "#92400e",
                  }}>
                    <strong>📝</strong> {customerNote}
                  </div>
                )}

                <div className="pay-trust-badges">
                  <span> Secure</span><span>Verified</span><span>🧶 Handmade</span><span> With Love</span>
                </div>
                {order.giftWrap && <div className="pay-giftwrap-note">🎁 Gift wrapping included</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`pay-toast pay-toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

const ConfirmRow = ({ label, value }) => (
  <div className="pay-confirm-row">
    <span className="pay-confirm-lbl">{label}</span>
    <span className="pay-confirm-val">{value}</span>
  </div>
);

const ReceiptRow = ({ label, value, valueColor }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "4px 0", fontSize: "13px",
  }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ color: valueColor ?? "#1e293b", fontWeight: 500 }}>{value}</span>
  </div>
);