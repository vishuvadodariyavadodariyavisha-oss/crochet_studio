import React, { useState, useEffect, useCallback } from "react";
import "./AdminCss/adminorder.css";

const API_BASE = "http://localhost:5000/api/orders";

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // ── Fetch all orders ──────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/getAllOrders`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("API response:", data); // debug - check browser console
      setOrders(Array.isArray(data) ? data : data.data ?? data.orders ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Update order status ───────────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/updateStatus/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
    } catch (err) {
      alert("Could not update status: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete order ──────────────────────────────────────────────
  const handleDelete = async (orderId) => {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/deleteOrder/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      alert("Could not delete order: " + err.message);
    }
  };

  // ── Stats from real data ──────────────────────────────────────
  const stats = {
    total:      orders.length,
    processing: orders.filter((o) => o.orderStatus === "processing").length,
    shipped:    orders.filter((o) => o.orderStatus === "shipped").length,
    delivered:  orders.filter((o) => o.orderStatus === "delivered").length,
  };

  // ── Filter + search ───────────────────────────────────────────
  const filtered = orders.filter((order) => {
    const id      = String(order._id || "").toLowerCase();
    const name    = (
      order.deliveryAddress?.fullName ||
      order.user?.name ||
      order.user?.email ||
      ""
    ).toLowerCase();
    const q           = search.toLowerCase();
    const matchSearch = name.includes(q) || id.includes(q);
    const matchStatus =
      statusFilter === "All" ||
      order.orderStatus === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ordersPerPage));
  const paginated  = filtered.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  // ── Field helpers matching your Order schema ──────────────────
  const getName = (o) =>
    o.deliveryAddress?.fullName ||
    o.user?.name ||
    o.user?.email ||
    "—";

  const getProduct = (o) => {
    if (!o.orderItems?.length) return "—";
    const first = o.orderItems[0];
    const extra = o.orderItems.length > 1 ? ` +${o.orderItems.length - 1} more` : "";
    return (first.name || "Product") + extra;
  };

  const getDate = (o) => {
    if (!o.createdAt) return "—";
    return new Date(o.createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const statusOptions = ["pending", "processing", "shipped", "delivered", "cancelled"];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      <div className="main-content">
        <div className="order-container">

          <div className="order-header">
            <h2>Order Management</h2>
            <button className="refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
          </div>

          {/* Stats */}
          <div className="order-stats">
            <div className="stat-card"><p>Total Orders</p><h3>{stats.total}</h3></div>
            <div className="stat-card"><p>Processing</p><h3>{stats.processing}</h3></div>
            <div className="stat-card"><p>Shipped</p><h3>{stats.shipped}</h3></div>
            <div className="stat-card"><p>Delivered</p><h3>{stats.delivered}</h3></div>
          </div>

          {/* Filters */}
          <div className="order-controls">
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Loading / Error / Empty states */}
          {loading && <p className="state-msg">Loading orders…</p>}
          {error && (
            <p className="state-msg error">
              ⚠ {error}{" "}
              <button onClick={fetchOrders} className="retry-btn">Retry</button>
            </p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="state-msg">No orders found.</p>
          )}

          {/* Table — only renders when we have data */}
          {!loading && !error && filtered.length > 0 && (
            <>
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((order) => {
                    const isUpdating = updatingId === order._id;
                    return (
                      <tr key={order._id}>
                        <td>#{String(order._id).slice(-6).toUpperCase()}</td>
                        <td>{getName(order)}</td>
                        <td>{getProduct(order)}</td>
                        <td>₹{(order.totalAmount ?? 0).toLocaleString("en-IN")}</td>
                        <td>
                          <select
                            className={`status-select ${order.orderStatus}`}
                            value={order.orderStatus || "pending"}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleStatusChange(order._id, e.target.value)
                            }
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={`pay-badge ${order.paymentStatus}`}>
                            {order.paymentStatus || "—"}
                          </span>
                        </td>
                        <td>{getDate(order)}</td>
                        <td className="action-cell">
                          <button
                            className="action-btn view-btn"
                            title="View"
                            onClick={() => alert(JSON.stringify(order, null, 2))}
                          >
                            Show
                          </button>
                          <button
                            className="action-btn delete-btn"
                            title="Delete"
                            onClick={() => handleDelete(order._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="page-info">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}