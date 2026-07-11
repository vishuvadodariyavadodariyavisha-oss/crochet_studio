import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminCss/dashboard.css";

const API_BASE = "http://localhost:5000/api/admin/dashboard";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    pendingOrders: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/recent-orders`),
      ]);

      const statsJson = await statsRes.json();
      const ordersJson = await ordersRes.json();

      if (statsJson.success) {
        setStats(statsJson.data);
      }

      if (ordersJson.success) {
        setRecentOrders(ordersJson.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (orderStatus) => {
    const map = {
      pending: "badge-pending",
      delivered: "badge-delivered",
      cancelled: "badge-cancelled",
      processing: "badge-processing",
      shipped: "badge-processing",
    };
    return map[orderStatus] || "badge-pending";
  };

  const getPaymentBadge = (paymentStatus) => {
    const map = {
      paid: "badge-delivered",
      pending: "badge-pending",
      failed: "badge-cancelled",
      refunded: "badge-processing",
    };
    return map[paymentStatus] || "badge-pending";
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="dashboard-content container">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="dashboard-content container">

        {/* Header */}
        <div className="dashboard-header">
          <h1>Welcome to Admin Dashboard</h1>
          <p className="dashboard-date">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert-card alert-danger">
            ❌ {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-cards">
          <div className="card">
            <div className="card-icon user-icon">👥</div>
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>

          <div className="card">
            <div className="card-icon product-icon">📦</div>
            <h3>Total Products</h3>
            <p>{stats.totalProducts}</p>
          </div>

          <div className="card">
            <div className="card-icon order-icon">🛒</div>
            <h3>Total Orders</h3>
            <p>{stats.totalOrders}</p>
          </div>

          <div className="card card-highlight">
            <div className="card-icon revenue-icon">💰</div>
            <h3>Total Revenue</h3>
            <p>₹{stats.totalRevenue?.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Alerts */}
        <div className="alert-row">
          {stats.lowStockCount > 0 && (
            <div className="alert-card alert-warning">
              ⚠️ <strong>{stats.lowStockCount} Products</strong> are low on stock
            </div>
          )}
          {stats.pendingOrders > 0 && (
            <div className="alert-card alert-info">
              🕐 <strong>{stats.pendingOrders} Orders</strong> are pending review
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-links">
          <h2>Quick Actions</h2>
          <div className="links">
            <button onClick={() => navigate("/AdminProduct")}>
              ➕ Add Product
            </button>

            <button onClick={() => navigate("/UserMang")}>
              👥 View Users
            </button>

            <button onClick={() => navigate("/Adminorder")}>
              🛒 View Orders
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <button
              className="view-all-btn"
              onClick={() => navigate("/Adminorder")}
            >
              View All Orders →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="no-data">No recent orders found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>City</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="order-id">
                        #{order._id?.slice(-6)}
                      </td>
                      <td>
                        <div>{order.customerName}</div>
                        <small className="text-muted">
                          {order.customerEmail}
                        </small>
                      </td>
                      <td>{order.productName}</td>
                      <td className="text-center">{order.totalItems}</td>
                      <td>
                        ₹{order.amount?.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge ${getPaymentBadge(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>{order.deliveryCity || "—"}</td>
                      <td>
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}