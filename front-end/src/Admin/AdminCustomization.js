import React, { useState, useEffect, useCallback } from "react";
import "./AdminCss/adminCustomization.css";

const BASE_URL = "http://localhost:5000/api/customization";

const STATUS_COLORS = {
  pending:   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  approved:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  rejected:  { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  completed: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  cancelled: { bg: "#f5f5f5", color: "#525252", border: "#d4d4d4" },
};

const api = {
  getAll:        ()              => fetch(`${BASE_URL}/getAll`).then(r => r.json()),
  getSingle:     (id)            => fetch(`${BASE_URL}/get/${id}`).then(r => r.json()),
  updateStatus:  (id, payload)   =>
    fetch(`${BASE_URL}/update-status/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => r.json()),
  toggleMessage: (id)            =>
    fetch(`${BASE_URL}/toggle-message/${id}`, { method: "PUT" }).then(r => r.json()),
  delete:        (id)            =>
    fetch(`${BASE_URL}/delete/${id}`, { method: "DELETE" }).then(r => r.json()),
  updateAddons: (id, addons)    =>
    fetch(`${BASE_URL}/update-addons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addons }),
    }).then(r => r.json()),
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        <span className="toast-icon">{t.type === "success" ? "✓" : "✕"}</span>
        {t.message}
      </div>
    ))}
  </div>
);

const SkeletonRow = () => (
  <tr className="skeleton-row">
    {[...Array(8)].map((_, i) => (
      <td key={i}><div className="skeleton-cell" /></td>
    ))}
  </tr>
);

// ─── Approve Modal (Amount + Add-ons) ────────────────────────────────────────
const ApproveModal = ({ order, onClose, onConfirm, loading }) => {
  const [amount, setAmount]       = useState(order.totalAmount || "");
  const [addons, setAddons]       = useState(order.addons || []);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");

  const addAddon = () => {
    if (!addonName.trim() || !addonPrice) return;
    setAddons(prev => [...prev, { name: addonName.trim(), price: Number(addonPrice) }]);
    setAddonName("");
    setAddonPrice("");
  };

  const removeAddon = (i) => setAddons(prev => prev.filter((_, idx) => idx !== i));

  const totalWithAddons = (Number(amount) || 0) + addons.reduce((s, a) => s + a.price, 0);

  return (
    <div className="custom-modal" onClick={onClose}>
      <div className="modal-content-box approve-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-row">
          <h5 className="modal-title-text">✓ Approve &amp; Set Amount</h5>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Base Amount */}
        <div className="field-group">
          <label className="field-label">Base Amount (₹)</label>
          <div className="rupee-input">
            <span className="rupee-sign">₹</span>
            <input
              type="number"
              className="field-input rupee-field"
              placeholder="0.00"
              value={amount}
              min={0}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Add-ons */}
        <div className="field-group">
          <label className="field-label">Add-on Items (Optional)</label>
          <div className="addon-row">
            <input
              className="field-input addon-name"
              placeholder="Item name (e.g. Gift wrap)"
              value={addonName}
              onChange={e => setAddonName(e.target.value)}
            />
            <div className="rupee-input addon-price-wrap">
              <span className="rupee-sign">₹</span>
              <input
                type="number"
                className="field-input rupee-field"
                placeholder="Price"
                value={addonPrice}
                min={0}
                onChange={e => setAddonPrice(e.target.value)}
              />
            </div>
            <button className="addon-add-btn" onClick={addAddon}>+</button>
          </div>

          {addons.length > 0 && (
            <div className="addon-list">
              {addons.map((a, i) => (
                <div key={i} className="addon-chip">
                  <span>{a.name}</span>
                  <span className="addon-price">₹{a.price}</span>
                  <button className="addon-remove" onClick={() => removeAddon(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Preview */}
        <div className="amount-preview">
          <span>Total Amount</span>
          <span className="amount-total">₹{totalWithAddons.toLocaleString("en-IN")}</span>
        </div>

        <div className="modal-action-row" style={{ marginTop: 18 }}>
          <button className="modal-btn modal-reset" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-approve"
            disabled={!amount || loading}
            onClick={() => onConfirm({ status: "approved", totalAmount: totalWithAddons, addons })}
          >
            {loading ? "Approving…" : "✓ Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reject Modal (Reason) ───────────────────────────────────────────────────
const RejectModal = ({ onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");

  const presets = [
    "Out of stock materials",
    "Design not feasible",
    "Size not available",
    "Customization limit exceeded",
  ];

  return (
    <div className="custom-modal" onClick={onClose}>
      <div className="modal-content-box confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-row">
          <h5 className="modal-title-text">✕ Reject Order</h5>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="field-group">
          <label className="field-label">Reason for Rejection</label>
          <div className="preset-chips">
            {presets.map(p => (
              <button
                key={p}
                className={`preset-chip ${reason === p ? "active" : ""}`}
                onClick={() => setReason(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            className="field-input reason-textarea"
            placeholder="Or type a custom reason…"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div className="modal-action-row" style={{ marginTop: 16 }}>
          <button className="modal-btn modal-reset" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-reject"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm({ status: "rejected", rejectionReason: reason.trim() })}
          >
            {loading ? "Rejecting…" : "✕ Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminCustomization = () => {
  const [orders, setOrders]             = useState([]);
  const [selected, setSelected]         = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toasts, setToasts]             = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [approveModal, setApproveModal] = useState(null); // order object
  const [rejectModal, setRejectModal]   = useState(null); // order id

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAll();
      setOrders(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      addToast("Failed to load orders.", "error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ─── Approve with amount + addons ─────────────────────────────────────────
  const handleApproveConfirm = async (payload) => {
    const id = approveModal._id;
    setActionLoading(id + "approve");
    try {
      await api.updateStatus(id, payload);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, ...payload } : o));
      if (selected?._id === id) setSelected(p => ({ ...p, ...payload }));
      addToast("Order approved with amount ₹" + payload.totalAmount);
      setApproveModal(null);
    } catch {
      addToast("Failed to approve.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Reject with reason ───────────────────────────────────────────────────
  const handleRejectConfirm = async (payload) => {
    const id = rejectModal;
    setActionLoading(id + "reject");
    try {
      await api.updateStatus(id, payload);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, ...payload } : o));
      if (selected?._id === id) setSelected(p => ({ ...p, ...payload }));
      addToast("Order rejected.");
      setRejectModal(null);
    } catch {
      addToast("Failed to reject.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Toggle message ───────────────────────────────────────────────────────
  const handleToggleMessage = async (id) => {
    setActionLoading(id + "toggle");
    try {
      await api.toggleMessage(id);
      setOrders(prev => prev.map(o => o._id === id ? { ...o, messageAvailable: !o.messageAvailable } : o));
      if (selected?._id === id) setSelected(p => ({ ...p, messageAvailable: !p.messageAvailable }));
      addToast("Message availability updated.");
    } catch {
      addToast("Failed to toggle message.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setActionLoading(id + "delete");
    try {
      await api.delete(id);
      setOrders(prev => prev.filter(o => o._id !== id));
      if (selected?._id === id) setSelected(null);
      addToast("Order deleted.");
    } catch {
      addToast("Failed to delete.", "error");
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const openDetail = async (o) => {
    setSelected(o);
    try {
      const fresh = await api.getSingle(o._id);
      const freshOrder = fresh.data ?? fresh;
      if (freshOrder?._id) setSelected(freshOrder);
    } catch { /* keep existing */ }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const name  = o.customerName ?? o.userId?.name ?? "";
    const order = o.orderId?.orderNumber ?? o._id ?? "";
    const matchSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === "pending").length,
    approved:  orders.filter(o => o.status === "approved").length,
    rejected:  orders.filter(o => o.status === "rejected").length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  return (
    <div className="adcust-page">
      <Toast toasts={toasts} />

      <div className="container-fluid mt-5 p-4 adcust-container">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="page-title mb-0">Customization Orders</h2>
            <p className="page-sub">Review, approve, or reject personalised order requests</p>
          </div>
          <div className="header-right">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by customer or order…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs mb-4">
          {["all", "pending", "approved", "rejected", "completed"].map(s => (
            <button
              key={s}
              className={`filter-tab ${filterStatus === s ? "active" : ""} tab-${s}`}
              onClick={() => setFilterStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="tab-count">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {!loading && orders.length === 0 && (
          <div className="api-empty-banner">
            <span className="api-empty-icon">📭</span>
            <div>
              <strong>No orders found</strong>
              <p>Make sure your backend is running at <code>{BASE_URL}</code></p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover adcust-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Color / Size</th>
                <th>Custom Text</th>
                <th>Message Theme</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No orders match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map(o => {
                  const sc = STATUS_COLORS[o.status] ?? STATUS_COLORS.pending;
                  const name     = o.customerName ?? o.userId?.name ?? "—";
                  const email    = o.customerEmail ?? o.userId?.email ?? "";
                  const orderNum = o.orderId?.orderNumber ?? o._id;
                  const isActing = actionLoading?.startsWith(o._id);

                  return (
                    <tr key={o._id} className={isActing ? "row-loading" : ""}>
                      <td className="fw-semibold">{orderNum}</td>
                      <td>
                        <div className="fw-semibold">{name}</div>
                        <div className="text-muted small">{email}</div>
                      </td>
                      <td>
                        {o.color && <span className="badge-pill pill-color">{o.color}</span>}
                        {o.size  && <span className="badge-pill pill-size">{o.size}</span>}
                      </td>
                      <td className="custom-text-cell">
                        {o.customText || <span className="text-muted fst-italic">—</span>}
                      </td>
                      <td>
                        <button
                          className={`toggle-btn ${o.messageAvailable ? "toggle-on" : "toggle-off"}`}
                          onClick={() => handleToggleMessage(o._id)}
                          disabled={actionLoading === o._id + "toggle"}
                        >
                          <span className="toggle-dot" />
                          {o.messageAvailable ? "Available" : "Unavailable"}
                        </button>
                      </td>
                      <td>
                        {o.totalAmount > 0
                          ? <span className="amount-cell">₹{o.totalAmount.toLocaleString("en-IN")}</span>
                          : <span className="text-muted fst-italic small">Not set</span>
                        }
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-wrap">
                          {o.status !== "approved" && o.status !== "completed" && (
                            <button
                              className="btn-action btn-approve"
                              onClick={() => setApproveModal(o)}
                              disabled={isActing}
                              title="Approve"
                            >✓</button>
                          )}
                          {o.status !== "rejected" && o.status !== "completed" && (
                            <button
                              className="btn-action btn-reject"
                              onClick={() => setRejectModal(o._id)}
                              disabled={isActing}
                              title="Reject"
                            >✕</button>
                          )}
                          <button className="btn-action btn-view" onClick={() => openDetail(o)} title="View">👁</button>
                          <button className="btn-action btn-delete" onClick={() => setDeleteConfirm(o._id)} disabled={isActing} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="table-footer">
            Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> orders
          </div>
        )}
      </div>

      {/* ─── Detail Modal ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="custom-modal" onClick={() => setSelected(null)}>
          <div className="modal-content-box detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h5 className="modal-title-text">
                Customization Details
                <span className="order-num-tag">{selected.orderId?.orderNumber ?? selected._id}</span>
              </h5>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="detail-grid">
              <DetailRow label="Customer"   value={selected.customerName ?? "—"} />
              <DetailRow label="Email"      value={selected.customerEmail ?? "—"} />
              <DetailRow label="Item Type"  value={selected.itemType ?? "—"} />
              <DetailRow label="Occasion"   value={selected.occasion ?? "—"} />
              <DetailRow label="Color"      value={selected.color ?? "—"} />
              <DetailRow label="Size"       value={selected.size ?? "—"} />
              <DetailRow label="Yarn Type"  value={selected.yarnType ?? "—"} />
              <DetailRow label="Qty"        value={selected.quantity ?? 1} />
              <DetailRow label="Recipient"  value={selected.recipientName ?? "—"} />
              <DetailRow label="Gift Wrap"  value={selected.giftWrap ? "Yes" : "No"} />
              <DetailRow label="Custom Text" value={selected.customText ?? "None"} />
              <DetailRow label="Special Instructions" value={selected.specialInstructions ?? "None"} fullWidth />

              {/* Amount Info */}
              <DetailRow label="Total Amount"   value={selected.totalAmount > 0 ? `₹${selected.totalAmount.toLocaleString("en-IN")}` : "Not quoted"} />
              <DetailRow label="Paid Amount"    value={selected.paidAmount > 0 ? `₹${selected.paidAmount.toLocaleString("en-IN")}` : "₹0"} />
              <DetailRow label="Payment Status" value={selected.paymentStatus ?? "unpaid"} />

              {/* Rejection Reason */}
              {selected.status === "rejected" && selected.rejectionReason && (
                <DetailRow label="Rejection Reason" value={selected.rejectionReason} fullWidth />
              )}

              {/* Add-ons */}
              {selected.addons?.length > 0 && (
                <div className="detail-row full-width">
                  <span className="detail-label">Add-ons</span>
                  <div className="addon-list">
                    {selected.addons.map((a, i) => (
                      <div key={i} className="addon-chip readonly">
                        <span>{a.name}</span>
                        <span className="addon-price">₹{a.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DetailRow label="Date" value={new Date(selected.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
            </div>

            <div className="modal-section">
              <span className="modal-section-label">Message Theme</span>
              <button
                className={`toggle-btn large-toggle ${selected.messageAvailable ? "toggle-on" : "toggle-off"}`}
                onClick={() => handleToggleMessage(selected._id)}
                disabled={actionLoading === selected._id + "toggle"}
              >
                <span className="toggle-dot" />
                {selected.messageAvailable ? "Available" : "Unavailable"}
              </button>
            </div>

            <div className="modal-action-row">
              {selected.status !== "approved" && selected.status !== "completed" && (
                <button
                  className="modal-btn modal-approve"
                  onClick={() => { setSelected(null); setApproveModal(selected); }}
                  disabled={!!actionLoading}
                >✓ Approve</button>
              )}
              {selected.status !== "rejected" && selected.status !== "completed" && (
                <button
                  className="modal-btn modal-reject"
                  onClick={() => { setSelected(null); setRejectModal(selected._id); }}
                  disabled={!!actionLoading}
                >✕ Reject</button>
              )}
              {selected.status !== "pending" && selected.status !== "completed" && (
                <button
                  className="modal-btn modal-reset"
                  onClick={async () => {
                    await api.updateStatus(selected._id, { status: "pending", rejectionReason: "" });
                    setOrders(prev => prev.map(o => o._id === selected._id ? { ...o, status: "pending", rejectionReason: "" } : o));
                    setSelected(p => ({ ...p, status: "pending", rejectionReason: "" }));
                    addToast("Reset to pending.");
                  }}
                  disabled={!!actionLoading}
                >↺ Reset</button>
              )}
              <button className="modal-btn modal-delete" onClick={() => { setSelected(null); setDeleteConfirm(selected._id); }}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Approve Modal ─────────────────────────────────────────────────── */}
      {approveModal && (
        <ApproveModal
          order={approveModal}
          onClose={() => setApproveModal(null)}
          onConfirm={handleApproveConfirm}
          loading={actionLoading === approveModal._id + "approve"}
        />
      )}

      {/* ─── Reject Modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <RejectModal
          onClose={() => setRejectModal(null)}
          onConfirm={handleRejectConfirm}
          loading={actionLoading === rejectModal + "reject"}
        />
      )}

      {/* ─── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="custom-modal" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content-box confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h4 className="confirm-title">Delete this order?</h4>
            <p className="confirm-sub">This action cannot be undone.</p>
            <div className="confirm-actions">
              <button className="modal-btn modal-reset" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="modal-btn modal-delete"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === deleteConfirm + "delete"}
              >
                {actionLoading === deleteConfirm + "delete" ? "Deleting…" : "Yes, Delete"}
              </button>
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

export default AdminCustomization;