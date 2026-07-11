import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import "./AdminCss/dashboard.css";

const API_BASE = "http://localhost:5000/api/admin/dashboard";

// ─── Helpers ──────────────────────────────────────────────────────
const COLORS = ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#f43f5e"];

const getStatusBadge = (orderStatus) => {
  const map = {
    pending:    "badge-pending",
    delivered:  "badge-delivered",
    cancelled:  "badge-cancelled",
    processing: "badge-processing",
    shipped:    "badge-processing",
  };
  return map[orderStatus] || "badge-pending";
};

const getPaymentBadge = (paymentStatus) => {
  const map = {
    paid:     "badge-delivered",
    pending:  "badge-pending",
    failed:   "badge-cancelled",
    refunded: "badge-processing",
  };
  return map[paymentStatus] || "badge-pending";
};

const buildMonthlySales = (orders) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const map = {};
  (orders || []).forEach((o) => {
    const key = months[new Date(o.createdAt).getMonth()];
    map[key] = (map[key] || 0) + (o.amount || 0);
  });
  return months.map((m) => ({ month: m, sales: map[m] || 0 }));
};

const buildStatusPie = (orders) => {
  const map = {};
  (orders || []).forEach((o) => {
    const s = o.orderStatus || "unknown";
    map[s] = (map[s] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

const buildTopProducts = (orders) => {
  const map = {};
  (orders || []).forEach((o) => {
    const k = o.productName || "Unknown";
    if (!map[k]) map[k] = { sales: 0, revenue: 0 };
    map[k].sales   += o.totalItems || 1;
    map[k].revenue += o.amount || 0;
  });
  return Object.entries(map)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
};

// ─── Main ─────────────────────────────────────────────────────────
export default function AdminReport() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => { fetchReportData(); }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/recent-orders`),
      ]);
      const statsJson  = await statsRes.json();
      const ordersJson = await ordersRes.json();
      if (statsJson.success)  setStats(statsJson.data);
      if (ordersJson.success) setRecentOrders(ordersJson.data);
    } catch (err) {
      console.error("Report fetch error:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const monthlySales = buildMonthlySales(recentOrders);
  const statusPie    = buildStatusPie(recentOrders);
  const topProducts  = buildTopProducts(recentOrders);

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="dashboard-content container">
          <div className="loading-spinner">Loading report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="dashboard-content container">

        {/* Header */}
        <div className="dashboard-header">
          <h1>📊 Admin Report & Analysis</h1>
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

        {/* Stats Cards — same as Dashboard */}
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

        {/* Alerts — same as Dashboard */}
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

        {/* Monthly Sales Chart */}
        <div className="recent-orders-section">
          <div className="section-header">
            <h2>📈 Monthly Sales Trend</h2>
          </div>
          <div className="table-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                />
                <Tooltip
                  formatter={(v) => [
                    `₹${Number(v).toLocaleString("en-IN")}`,
                    "Sales",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#salesGrad)"
                  dot={{ fill: "#f97316", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie + Top Products Bar — side by side using stats-cards grid */}
        <div className="stats-cards" style={{ alignItems: "flex-start" }}>

          {/* Order Status Pie */}
          <div className="card" style={{ flex: 1, minWidth: 260 }}>
            <div className="card-icon order-icon">🍩</div>
            <h3>Order Status</h3>
            {statusPie.length === 0 ? (
              <p className="no-data">No order data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} orders`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Products Bar */}
          <div className="card" style={{ flex: 2, minWidth: 320 }}>
            <div className="card-icon product-icon">🏆</div>
            <h3>Top Products by Items Sold</h3>
            {topProducts.length === 0 ? (
              <p className="no-data">No product data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v, n) => [
                      n === "sales"
                        ? `${v} items`
                        : `₹${Number(v).toLocaleString("en-IN")}`,
                      n === "sales" ? "Items Sold" : "Revenue",
                    ]}
                  />
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* Recent Orders Table — same as Dashboard */}
        <div className="recent-orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
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
                      <td className="order-id">#{order._id?.slice(-6)}</td>
                      <td>
                        <div>{order.customerName}</div>
                        <small className="text-muted">{order.customerEmail}</small>
                      </td>
                      <td>{order.productName}</td>
                      <td className="text-center">{order.totalItems}</td>
                      <td>₹{order.amount?.toLocaleString("en-IN")}</td>
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