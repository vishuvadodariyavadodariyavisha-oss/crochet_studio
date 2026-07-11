import React, { useState, useEffect, useCallback } from "react";
import "./AdminCss/adminBulkOrder.css";

const BASE_URL = "http://localhost:5000/";

const safeJson = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  await res.text();
  throw new Error(`Server error (${res.status})`);
};

const getToken = () =>
  localStorage.getItem("adminToken") || localStorage.getItem("token") || "";

const STATUS_COLORS = {
  requested:  { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  approved:   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  rejected:   { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  processing: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  completed:  { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  cancelled:  { bg: "#f9fafb", color: "#374151", border: "#e5e7eb" },
};

const ALL_STATUSES = ["requested", "approved", "rejected", "processing", "completed", "cancelled"];

// Statuses where approve button should NOT show (order is already past that stage)
const APPROVE_HIDDEN_STATUSES = ["approved", "completed", "cancelled", "rejected"];

// Statuses available in modal bottom row (never includes "approved" — that's handled separately above)
const MODAL_BOTTOM_STATUSES = ["rejected", "processing", "completed", "cancelled"];

const AdminBulkOrder = () => {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [quoteInput,    setQuoteInput]    = useState("");
  const [quoteError,    setQuoteError]    = useState("");
  const [adminNote,     setAdminNote]     = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res  = await fetch(`${BASE_URL}api/bulkorders/getAllBulkOrders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch orders");
      setOrders(data.data || data.bulkOrders || []);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Sync selected when orders update ─────────────────────────────────────────
  const syncSelected = (id, patch) => {
    setOrders(prev => prev.map(o => o._id === id ? { ...o, ...patch } : o));
    setSelected(prev => prev?._id === id ? { ...prev, ...patch } : prev);
  };

  // ── Update status only ────────────────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus, note) => {
    try {
      setActionLoading(true);
      const res  = await fetch(`${BASE_URL}api/bulkorders/${id}/status`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ status: newStatus, adminNote: note || undefined }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update status");
      syncSelected(id, data.bulkOrder || data.data || { status: newStatus });
      setAdminNote("");
      showToast(`Status updated to "${newStatus}"`);
    } catch (e) { showToast(e.message, "error"); }
    finally     { setActionLoading(false); }
  };

  // ── Save quoted price ─────────────────────────────────────────────────────────
  const handleSaveQuote = async (id) => {
    const price = Number(quoteInput);
    if (!quoteInput || isNaN(price) || price <= 0) {
      setQuoteError("Enter a valid quoted price.");
      return;
    }
    setQuoteError("");
    try {
      setActionLoading(true);
      const res  = await fetch(`${BASE_URL}api/bulkorders/${id}/quote`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ quotedPrice: price }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to save quote");
      syncSelected(id, { ...(data.bulkOrder || data.data || {}), quotedPrice: price });
      setQuoteInput("");
      showToast("Quoted price saved!");
    } catch (e) { showToast(e.message, "error"); }
    finally     { setActionLoading(false); }
  };

  // ── Save price + note, then approve (atomic from UX perspective) ──────────────
  const handleApprove = async (id) => {
    // Must have a quoted price — either already saved or entered right now
    const existingPrice = selected?.quotedPrice;
    const newPrice      = Number(quoteInput);
    const hasNewPrice   = quoteInput && !isNaN(newPrice) && newPrice > 0;

    if (!existingPrice && !hasNewPrice) {
      setQuoteError("Set a quoted price before approving.");
      return;
    }
    setQuoteError("");
    try {
      setActionLoading(true);

      // 1. Save price if a new one is entered
      if (hasNewPrice) {
        const qRes  = await fetch(`${BASE_URL}api/bulkorders/${id}/quote`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify({ quotedPrice: newPrice }),
        });
        const qData = await safeJson(qRes);
        if (!qRes.ok) throw new Error(qData?.message || "Failed to save quote");
        syncSelected(id, { ...(qData.bulkOrder || qData.data || {}), quotedPrice: newPrice });
        setQuoteInput("");
      }

      // 2. Set status to approved (with optional admin note)
      const sRes  = await fetch(`${BASE_URL}api/bulkorders/${id}/status`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ status: "approved", adminNote: adminNote || undefined }),
      });
      const sData = await safeJson(sRes);
      if (!sRes.ok) throw new Error(sData?.message || "Failed to approve");
      syncSelected(id, sData.bulkOrder || sData.data || { status: "approved" });
      setAdminNote("");
      showToast("Order approved and customer notified!");
    } catch (e) { showToast(e.message, "error"); }
    finally     { setActionLoading(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bulk order?")) return;
    try {
      setActionLoading(true);
      const res  = await fetch(`${BASE_URL}api/bulkorders/deleteBulkOrder/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      setOrders(prev => prev.filter(o => o._id !== id));
      if (selected?._id === id) setSelected(null);
      showToast("Order deleted.");
    } catch (e) { showToast(e.message, "error"); }
    finally     { setActionLoading(false); }
  };

  // ── Filtered + counts ─────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const name    = o.userId?.name  || o.userName  || "";
    const email   = o.userId?.email || o.userEmail || "";
    const orderNo = o.orderNumber   || o._id       || "";
    const product = o.productId?.productName || o.productType || "";
    const q = searchTerm.toLowerCase();
    const matchSearch =
      name.toLowerCase().includes(q)    ||
      orderNo.toLowerCase().includes(q) ||
      product.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = { all: orders.length };
  ALL_STATUSES.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });

  // ── helpers ───────────────────────────────────────────────────────────────────
  const openModal = (o) => {
    setSelected(o);
    setQuoteInput(o.quotedPrice ? "" : ""); // always start empty so admin types fresh
    setQuoteError("");
    setAdminNote(o.adminNote || "");
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="adcust-page">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          padding: "12px 20px", borderRadius: "10px", fontWeight: 600, fontSize: "14px",
          background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
          color:      toast.type === "error" ? "#b91c1c" : "#15803d",
          border:     `1px solid ${toast.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          boxShadow:  "0 4px 12px rgba(0,0,0,0.14)",
        }}>
          {toast.msg}
        </div>
      )}

      <div className="container-fluid mt-5 p-4 adcust-container">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="page-title mb-0">Bulk Orders</h2>
            <p className="page-sub">Set quoted price + note first, then approve. Approve disappears once done.</p>
          </div>
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by customer, order, product…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {/* <button onClick={fetchOrders} style={{
              padding: "9px 16px", borderRadius: "10px", border: "1.5px solid #e8ddd5",
              background: "white", color: "#6f4e37", cursor: "pointer", fontWeight: 600, fontSize: "13px",
            }}>
              🔄 Refresh
            </button> */}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs mb-4">
          {["all", ...ALL_STATUSES].map(s => (
            (counts[s] > 0 || s === "all") ? (
              <button key={s}
                className={`filter-tab ${filterStatus === s ? "active" : ""} tab-${s === "requested" ? "pending" : s}`}
                onClick={() => setFilterStatus(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="tab-count">{counts[s] || 0}</span>
              </button>
            ) : null
          ))}
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: "#6f4e37" }} role="status"></div>
            <p style={{ color: "#a08060", marginTop: "12px" }}>Loading bulk orders...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-5">
            <p style={{ color: "#b91c1c", fontSize: "15px" }}>⚠️ {error}</p>
            <button onClick={fetchOrders} style={{
              marginTop: "10px", padding: "8px 20px", borderRadius: "8px",
              background: "#6f4e37", color: "white", border: "none", cursor: "pointer",
            }}>Try Again</button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="table table-hover adcust-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Product / Qty</th>
                  <th>Event</th>
                  <th>Delivery Date</th>
                  <th>Quoted Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">No bulk orders found.</td></tr>
                ) : filtered.map(o => {
                  const sc            = STATUS_COLORS[o.status] || STATUS_COLORS.requested;
                  const customerName  = o.userId?.name  || o.userName  || "—";
                  const customerEmail = o.userId?.email || o.userEmail || "—";
                  const productName   = o.productId?.productName || o.productType || "—";

                  return (
                    <tr key={o._id}>
                      <td className="fw-semibold">{o.orderNumber || o._id?.slice(-6).toUpperCase()}</td>
                      <td>
                        <div className="fw-semibold">{customerName}</div>
                        <div className="text-muted small">{customerEmail}</div>
                      </td>
                      <td>
                        <span className="badge-pill pill-color">{productName}</span><br />
                        <span className="badge-pill pill-size">Qty: {o.quantity}</span>
                      </td>
                      <td>{o.eventType || <span className="text-muted fst-italic">—</span>}</td>
                      <td>{fmtDate(o.deliveryDate)}</td>
                      <td>
                        {o.quotedPrice
                          ? <span className="quote-price">₹{o.quotedPrice.toLocaleString("en-IN")}</span>
                          : <span className="needs-price-tag">Price needed</span>}
                      </td>
                      <td>
                        <span className="status-badge"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-wrap">
                          {/* View — opens modal where approve happens */}
                          <button className="btn-action btn-view" onClick={() => openModal(o)}>
                            👁
                          </button>
                          {/* Quick reject only if not already finalized */}
                          {!["rejected", "completed", "cancelled"].includes(o.status) && (
                            <button className="btn-action btn-reject"
                              onClick={() => handleStatusChange(o._id, "rejected", "")}>
                              ✕
                            </button>
                          )}
                          <button className="btn-action btn-delete" onClick={() => handleDelete(o._id)}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════ Detail Modal ══════════════════ */}
      {selected && (
        <div className="custom-modal" onClick={() => setSelected(null)}>
          <div className="modal-content-box detail-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header-row">
              <h5 className="modal-title-text">
                 Bulk Order Details
                <span className="order-num-tag">
                  {selected.orderNumber || selected._id?.slice(-6).toUpperCase()}
                </span>
              </h5>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            {/* Status pill */}
            <div style={{ marginBottom: "16px" }}>
              <span className="status-badge" style={{
                background: STATUS_COLORS[selected.status]?.bg,
                color:      STATUS_COLORS[selected.status]?.color,
                border:     `1px solid ${STATUS_COLORS[selected.status]?.border}`,
                fontSize:   "13px", padding: "5px 14px",
              }}>
                {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
              </span>
              {selected.paymentStatus === "paid" && (
                <span style={{
                  marginLeft: "8px", padding: "4px 12px", borderRadius: "999px",
                  background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0",
                  fontSize: "12px", fontWeight: 700,
                }}>
                  Payment Received
                </span>
              )}
            </div>

            {/* Details grid */}
            <div className="detail-grid">
              <DetailRow label="Customer"      value={selected.userId?.name  || selected.userName  || "—"} />
              <DetailRow label="Email"         value={selected.userId?.email || selected.userEmail || "—"} />
              <DetailRow label="Product"       value={selected.productId?.productName || selected.productType || "—"} />
              <DetailRow label="Quantity"      value={`${selected.quantity} pcs`} />
              <DetailRow label="Event"         value={selected.eventType || "—"} />
              <DetailRow label="Delivery Date" value={fmtDate(selected.deliveryDate)} />
              <DetailRow label="Order Type"    value={selected.orderType === "direct" ? "⚡ Direct" : "📋 Quote Request"} />
              {selected.paymentMethod  && <DetailRow label="Payment Method" value={selected.paymentMethod} />}
              {selected.paymentStatus  && <DetailRow label="Payment Status" value={selected.paymentStatus} />}
              {selected.selectedSize   && <DetailRow label="Size"           value={selected.selectedSize} />}
              {selected.customText     && <DetailRow label="Custom Text"    value={selected.customText}   fullWidth />}
              {selected.instructions   && <DetailRow label="Instructions"   value={selected.instructions} fullWidth />}
              {selected.colorNotes     && <DetailRow label="Color Notes"    value={selected.colorNotes}   fullWidth />}
              {selected.primaryColor   && <DetailRow label="Primary Color"  value={selected.primaryColor} />}
              {selected.secondaryColor && <DetailRow label="Secondary Color" value={selected.secondaryColor} />}
              {selected.yarnColors?.length > 0 && (
                <div className="detail-row full-width">
                  <span className="detail-label">Yarn Colors</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                    {selected.yarnColors.map(hex => (
                      <div key={hex} title={hex} style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        backgroundColor: hex, border: "2px solid #e5e7eb",
                      }} />
                    ))}
                  </div>
                </div>
              )}
              {selected.finalAmount && (
                <DetailRow label="Final Amount" value={`₹${selected.finalAmount.toLocaleString("en-IN")}`} />
              )}
              <DetailRow label="Placed On" value={fmtDate(selected.createdAt)} />
            </div>

            {/* ══ APPROVE SECTION — only show if order is NOT yet approved/completed/cancelled/rejected ══ */}
            {!APPROVE_HIDDEN_STATUSES.includes(selected.status) && (
              <div className="approve-section">
                <div className="approve-section-title">
                  Approve Order
                  <span className="approve-section-sub">
                    Set price and note first — required before approving
                  </span>
                </div>

                {/* Step 1: Quoted Price */}
                <div className="approve-step">
                  <label className="approve-step-label">
                    <span className="step-num">1</span> Quoted Price <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="quote-input-row">
                    <span className="rupee-sign">₹</span>
                    <input
                      type="number"
                      className={`quote-input ${quoteError ? "input-error" : ""}`}
                      placeholder={selected.quotedPrice ? `Current: ₹${selected.quotedPrice.toLocaleString("en-IN")}` : "Enter quoted price"}
                      value={quoteInput}
                      min={1}
                      onChange={e => { setQuoteInput(e.target.value); setQuoteError(""); }}
                    />
                    <button className="quote-save-btn"
                      onClick={() => handleSaveQuote(selected._id)}
                      disabled={actionLoading}>
                      {actionLoading ? "..." : "Save"}
                    </button>
                  </div>
                  {quoteError && <p className="field-error">{quoteError}</p>}
                  {selected.quotedPrice && (
                    <p className="current-quote">
                      Saved price: <strong>₹{selected.quotedPrice.toLocaleString("en-IN")}</strong>
                      <span style={{ marginLeft: "6px", color: "#15803d", fontSize: "12px" }}>✓</span>
                    </p>
                  )}
                </div>

                {/* Step 2: Admin Note */}
                <div className="approve-step">
                  <label className="approve-step-label">
                    <span className="step-num">2</span> Note for Customer (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="admin-note-input"
                    placeholder="e.g. Delivery will take 15 days. Custom packaging included."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                </div>

                {/* Step 3: Approve button — disabled until price is set */}
                <div className="approve-step">
                  <label className="approve-step-label">
                    <span className="step-num">3</span> Approve
                  </label>
                  <button
                    className={`approve-btn ${(!selected.quotedPrice && !(quoteInput && Number(quoteInput) > 0)) ? "approve-btn-disabled" : ""}`}
                    onClick={() => handleApprove(selected._id)}
                    disabled={actionLoading || (!selected.quotedPrice && !(quoteInput && Number(quoteInput) > 0))}
                  >
                    {actionLoading ? "Processing..." : "Approve Order"}
                  </button>
                  {!selected.quotedPrice && !(quoteInput && Number(quoteInput) > 0) && (
                    <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "6px" }}>
                      Set a quoted price above to enable approval.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Approved/Completed — show saved price read-only */}
            {APPROVE_HIDDEN_STATUSES.includes(selected.status) && selected.quotedPrice && (
              <div className="quote-readonly-box">
                <span className="quote-readonly-label">Quoted Price</span>
                <span className="quote-readonly-value">₹{selected.quotedPrice.toLocaleString("en-IN")}</span>
              </div>
            )}

            {/* ══ OTHER STATUS ACTIONS — never includes "approved" ══ */}
            <div className="modal-action-row">
              {MODAL_BOTTOM_STATUSES
                .filter(s => s !== selected.status)
                .map(s => (
                  <button key={s} className="modal-btn"
                    style={{
                      background: STATUS_COLORS[s]?.bg   || "#f9fafb",
                      color:      STATUS_COLORS[s]?.color || "#374151",
                      border:     `1px solid ${STATUS_COLORS[s]?.border || "#e5e7eb"}`,
                    }}
                    onClick={() => handleStatusChange(selected._id, s, adminNote)}
                    disabled={actionLoading}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, fullWidth }) => (
  <div className={`detail-row ${fullWidth ? "full-width" : ""}`}>
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value}</span>
  </div>
);

export default AdminBulkOrder;