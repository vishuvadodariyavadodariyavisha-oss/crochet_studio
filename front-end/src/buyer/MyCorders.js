import { useState, useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  import { useAuth } from "../context/authContext";

  const BASE_URL = "http://localhost:5000/api/customization";

  /* ── Status config ── */
  const STATUS_CONFIG = {
    pending:  { label: "Pending",  bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", dot: "#f97316" },
    approved: { label: "Approved", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
    rejected: { label: "Rejected", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" },
  };

  /* ── Skeleton Card ── */
  const SkeletonCard = () => (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 22,
      border: "1px solid #e3cfc0", boxShadow: "0 4px 24px rgba(61,32,16,0.09)",
      display: "flex", flexDirection: "column", gap: 12
    }}>
      {[55, 80, 65, 40].map((w, i) => (
        <div key={i} style={{
          height: 14, width: `${w}%`, borderRadius: 6,
          background: "linear-gradient(90deg, #f0e8e0 25%, #f9f3ee 50%, #f0e8e0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite"
        }} />
      ))}
    </div>
  );

  /* ── MRow Helper ── */
  const MRow = ({ label, value, full }) => (
    <div style={{
      gridColumn: full ? "1 / -1" : "auto",
      background: "#f5ede3", border: "1px solid #e3cfc0",
      borderRadius: 10, padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 3
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#a08060"
      }}>{label}</span>
      <span style={{ fontSize: 14, color: "#2d1a0e", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
    Payment Modal
  ══════════════════════════════════════════════════════════ */
  function PaymentModal({ order, onClose, onPay }) {
    const totalAmount = order.totalAmount ?? 0;

    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(30,15,5,0.55)",
          backdropFilter: "blur(4px)", display: "flex",
          alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16, animation: "fadeIn 0.2s ease"
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#fff", borderRadius: 16,
            boxShadow: "0 24px 80px rgba(30,15,5,0.22)",
            width: "100%", maxWidth: 460, padding: 28,
            animation: "slideUp 0.25s ease"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h2 style={{
                margin: 0, fontSize: 20, fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600, color: "#3d2010"
              }}>💳 Payment</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#a08060", fontWeight: 300 }}>
                {order.itemType} — #{order._id?.slice(-8).toUpperCase()}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid #e3cfc0",
              borderRadius: "50%", width: 30, height: 30,
              fontSize: 18, cursor: "pointer", color: "#a08060",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>×</button>
          </div>

          {/* Amount */}
          {totalAmount > 0 && (
            <div style={{
              background: "#f5ede3", border: "1px solid #e3cfc0",
              borderRadius: 10, padding: "14px 18px", marginBottom: 18
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6f4e37", fontSize: 14 }}>Total Order Amount</span>
                <strong style={{ fontSize: 20, color: "#2d1a0e" }}>₹{totalAmount.toLocaleString("en-IN")}</strong>
              </div>
            </div>
          )}

          {/* Status Note — Approved only */}
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 18, fontSize: 14,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
          }}>
             Order Approved! Complete full payment to start production.
          </div>

          {/* Pay Full Amount Button only */}
          <button onClick={() => onPay(order._id, "full")} style={{
            width: "100%", padding: "13px 20px",
            background: "linear-gradient(135deg, #6f4e37, #8b5e3c)",
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
             Pay Full Amount
            {totalAmount > 0 && <span style={{ opacity: 0.85 }}>₹{totalAmount.toLocaleString("en-IN")}</span>}
          </button>

          <button onClick={onClose} style={{
            width: "100%", marginTop: 10, background: "#f5ede3",
            border: "1px solid #e3cfc0", borderRadius: 10, padding: "12px",
            color: "#6f4e37", fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>Cancel</button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
    Main Component
  ══════════════════════════════════════════════════════════ */
  export default function MyCustomOrders() {
    const navigate = useNavigate();
    const { userToken, isUser } = useAuth();

    const [orders,       setOrders]       = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [selected,     setSelected]     = useState(null);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [filter,       setFilter]       = useState("all");
    const [toast,        setToast]        = useState(null);

    const getUserIdFromToken = () => {
      try {
        const payload = JSON.parse(atob(userToken.split(".")[1]));
        return payload.id ?? payload._id ?? payload.userId;
      } catch { return null; }
    };

    const showToast = (type, message) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    };

    const fetchOrders = async () => {
      setLoading(true); setError(null);
      try {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Invalid session. Please login again.");
        const res  = await fetch(`${BASE_URL}/my-orders/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load orders.");
        setOrders(Array.isArray(data) ? data : data.data ?? []);
      } catch (err) {
        setError(err.message ?? "Network error.");
      } finally { setLoading(false); }
    };

    useEffect(() => {
      if (!isUser || !userToken) {
        setError("You must be logged in to view your orders.");
        setLoading(false); return;
      }
      fetchOrders();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCancel = async (orderId) => {
      if (!window.confirm("Are you sure you want to cancel this order?")) return;
      try {
        const res  = await fetch(`${BASE_URL}/cancel/${orderId}`, {
          method: "PATCH", headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Cancel failed.");
        showToast("success", "Order cancelled successfully.");
        fetchOrders();
      } catch (err) { showToast("error", err.message ?? "Cancel failed."); }
    };

    // Always navigate with type=full
    const handlePay = (orderId, type) => {
      setPaymentOrder(null);
      navigate(`/payment/${orderId}?type=full`);
    };

    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
    const counts = {
      all:      orders.length,
      pending:  orders.filter(o => o.status === "pending").length,
      approved: orders.filter(o => o.status === "approved").length,
      rejected: orders.filter(o => o.status === "rejected").length,
    };

    const TAB_STYLES = {
      all:      { activeColor: "#3d2010", activeBg: "#fdf8f3", activeBorder: "#3d2010" },
      pending:  { activeColor: "#c2410c", activeBg: "#fff7ed",  activeBorder: "#fed7aa" },
      approved: { activeColor: "#15803d", activeBg: "#f0fdf4",  activeBorder: "#bbf7d0" },
      rejected: { activeColor: "#b91c1c", activeBg: "#fef2f2",  activeBorder: "#fecaca" },
    };

    return (
      <div style={{
        minHeight: "100vh",
        background: "#fdf8f3",
        fontFamily: "'DM Sans', sans-serif",
        color: "#2d1a0e"
      }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
          @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .mco-card-hover { transition: box-shadow 0.25s, transform 0.25s; }
          .mco-card-hover:hover { box-shadow: 0 12px 40px rgba(61,32,16,0.14) !important; transform: translateY(-3px); }
          .mco-tab-hover:hover { background: #f5ede3 !important; }
          .mco-btn-hover:hover { opacity: 0.85; transform: scale(0.97); }
          .mco-new-btn:hover { background: rgba(255,255,255,0.28) !important; transform: translateY(-1px); }
          .mco-back-btn:hover { background: rgba(255,255,255,0.22) !important; }
          .mco-refresh-btn:hover { border-color: #6f4e37 !important; color: #6f4e37 !important; }
        `}</style>

        {/* ── Hero ── */}
        <div style={{
          background: "linear-gradient(160deg, #3d2010, #6f4e37 60%, #8b5e3c)",
          padding: "32px 40px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          position: "relative"
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
            <button
              className="mco-back-btn"
              onClick={() => navigate(-1)}
              style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.85)", padding: "8px 16px", borderRadius: 100,
                fontSize: 13, cursor: "pointer", transition: "all 0.2s"
              }}
            >← Back</button>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            position: "relative", zIndex: 1, flex: 1, justifyContent: "center"
          }}>
            <span style={{ fontSize: 32 }}>🧶</span>
            <div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 600, color: "#fff", margin: "0 0 4px", letterSpacing: "0.01em"
              }}>My Custom Orders</h1>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: 0, fontWeight: 300 }}>
                Track all your personalised crochet requests
              </p>
            </div>
          </div>

          <button
            className="mco-new-btn"
            onClick={() => navigate("/customizeorder")}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)",
              color: "#fff", padding: "10px 22px", borderRadius: 100,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s", position: "relative", zIndex: 1
            }}
          >+ New Order</button>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 1100, margin: "32px auto 60px", padding: "0 20px" }}>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["all", "pending", "approved", "rejected"].map(s => {
              const ts = TAB_STYLES[s];
              const isActive = filter === s;
              return (
                <button
                  key={s}
                  className={isActive ? "" : "mco-tab-hover"}
                  onClick={() => setFilter(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 100, cursor: "pointer",
                    fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                    background: isActive ? ts.activeBg : "#fff",
                    color: isActive ? ts.activeColor : "#6f4e37",
                    border: isActive ? `1px solid ${ts.activeBorder}` : "1px solid #e3cfc0",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span style={{
                    background: "rgba(0,0,0,0.08)", borderRadius: 100,
                    padding: "1px 8px", fontSize: 11, fontWeight: 700
                  }}>{counts[s]}</span>
                </button>
              );
            })}
            <button
              className="mco-refresh-btn"
              onClick={fetchOrders}
              style={{
                marginLeft: "auto", background: "#fff", border: "1px solid #e3cfc0",
                color: "#6f4e37", padding: "8px 16px", borderRadius: 100,
                fontSize: 13, cursor: "pointer", transition: "all 0.2s"
              }}
            >↻ Refresh</button>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 16, padding: "20px 24px", marginBottom: 20,
              fontSize: 14, color: "#b91c1c"
            }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div>{error}</div>
                {!isUser && (
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      background: "none", border: "none", color: "#6f4e37",
                      textDecoration: "underline", cursor: "pointer",
                      fontSize: 13, padding: 0, marginTop: 6
                    }}
                  >Go to Login →</button>
                )}
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "72px 24px" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🧵</div>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.5rem", color: "#3d2010", margin: "0 0 8px"
              }}>
                {filter === "all" ? "No orders yet!" : `No ${filter} orders`}
              </h3>
              <p style={{ color: "#a08060", fontSize: 14, margin: "0 0 24px" }}>
                {filter === "all"
                  ? "You haven't placed any custom crochet orders yet."
                  : `You have no ${filter} orders right now.`}
              </p>
              {filter === "all" && (
                <button
                  onClick={() => navigate("/customizeorder")}
                  style={{
                    background: "linear-gradient(135deg, #6f4e37, #8b5e3c)",
                    color: "#fff", border: "none", padding: "12px 28px",
                    borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: "pointer"
                  }}
                >🧶 Place Your First Order</button>
              )}
            </div>
          )}

          {/* ── Orders Grid ── */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {filtered.map((order) => {
                const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;

                // ✅ Pay button only shown when admin has APPROVED and not yet paid
                const canPay = order.status === "approved" && order.paymentStatus !== "paid";
                const isPaid = order.paymentStatus === "paid";

                return (
                  <div
                    key={order._id}
                    className="mco-card-hover"
                    style={{
                      background: "#fff", border: "1px solid #e3cfc0",
                      borderRadius: 16, padding: 22,
                      boxShadow: "0 4px 24px rgba(61,32,16,0.09)",
                      display: "flex", flexDirection: "column", gap: 12,
                      animation: "slideUp 0.3s ease"
                    }}
                  >
                    {/* Top Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 24 }}>🧶</span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 11, fontWeight: 700, padding: "4px 12px",
                        borderRadius: 100, textTransform: "capitalize", letterSpacing: "0.4px",
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => setSelected(order)}
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.2rem", fontWeight: 600,
                        color: "#3d2010", margin: 0, cursor: "pointer"
                      }}
                    >{order.itemType}</h3>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[
                        order.color    && `🎨 ${order.color}`,
                        order.yarnType && `🧵 ${order.yarnType}`,
                        order.size     && `📐 ${order.size}`,
                        `📦 Qty: ${order.quantity}`,
                        order.occasion && `🎉 ${order.occasion}`,
                        order.giftWrap && "🎁 Gift Wrapped"
                      ].filter(Boolean).map((tag, i) => (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#f5ede3", border: "1px solid #e3cfc0",
                          color: "#6f4e37", fontSize: 12, fontWeight: 500,
                          padding: "4px 10px", borderRadius: 100
                        }}>{tag}</span>
                      ))}
                    </div>

                    {order.customText && (
                      <p style={{
                        fontSize: 13, color: "#6f4e37", fontStyle: "italic",
                        background: "#f2e3d5", borderRadius: 10,
                        padding: "8px 12px", margin: 0,
                        borderLeft: "3px solid #8b5e3c"
                      }}> "{order.customText}"</p>
                    )}

                    {/* Total Amount */}
                    {order.totalAmount > 0 && (
                      <div style={{
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 8, padding: "6px 12px",
                        fontSize: 13, fontWeight: 600, color: "#15803d"
                      }}>
                         ₹{order.totalAmount.toLocaleString("en-IN")}
                      </div>
                    )}

                    {/* ✅ Payment Banner — Only for Approved orders */}
                    {canPay && (
                      <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 8,
                        padding: "10px 14px", borderRadius: 10, flexWrap: "wrap",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0"
                      }}>
                        <span style={{ fontSize: 12, color: "#15803d" }}>
                          ✅ Approved — Pay full amount to start production
                        </span>
                        <button
                          onClick={() => setPaymentOrder(order)}
                          style={{
                            background: "#15803d",
                            color: "#fff", border: "none", borderRadius: 100,
                            padding: "5px 14px", fontSize: 12, fontWeight: 700,
                            cursor: "pointer", whiteSpace: "nowrap"
                          }}
                        >Pay Now</button>
                      </div>
                    )}

                    {isPaid && (
                      <div style={{
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 10, padding: "8px 12px",
                        fontSize: 12, color: "#15803d", fontWeight: 700,
                        textAlign: "center"
                      }}>✅ Payment Complete</div>
                    )}

                    {/* Footer */}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", paddingTop: 10,
                      borderTop: "1px solid #e3cfc0", marginTop: "auto"
                    }}>
                      <span style={{ fontSize: 12, color: "#a08060" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {order.status === "pending" && (
                          <button
                            className="mco-btn-hover"
                            onClick={e => { e.stopPropagation(); handleCancel(order._id); }}
                            style={{
                              background: "#fef2f2", color: "#b91c1c",
                              border: "1px solid #fecaca", borderRadius: 8,
                              padding: "5px 10px", fontSize: 12, fontWeight: 600,
                              cursor: "pointer", transition: "all 0.15s"
                            }}
                          >🗑️ Cancel</button>
                        )}
                        <button
                          className="mco-btn-hover"
                          onClick={() => setSelected(order)}
                          style={{
                            background: "#f5ede3", color: "#6f4e37",
                            border: "1px solid #e3cfc0", borderRadius: 8,
                            padding: "5px 10px", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s"
                          }}
                        >View →</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <p style={{ textAlign: "right", color: "#a08060", fontSize: 12, marginTop: 16 }}>
              Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> orders
            </p>
          )}
        </div>

        {/* ── Detail Modal ── */}
        {selected && (
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(30,15,5,0.55)",
              backdropFilter: "blur(4px)", display: "flex",
              alignItems: "center", justifyContent: "center",
              zIndex: 1000, padding: 16, animation: "fadeIn 0.2s ease"
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 16, padding: 28,
                width: "100%", maxWidth: 540,
                maxHeight: "88vh", overflowY: "auto",
                boxShadow: "0 24px 80px rgba(30,15,5,0.22)",
                animation: "slideUp 0.25s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.4rem", color: "#3d2010", margin: "0 0 4px"
                  }}>Order Details</h3>
                  <span style={{ fontSize: 11, color: "#a08060", fontFamily: "monospace" }}>
                    {selected._id}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "none", border: "1px solid #e3cfc0",
                    color: "#a08060", width: 30, height: 30,
                    borderRadius: "50%", cursor: "pointer", fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >×</button>
              </div>

              {/* Status */}
              {(() => {
                const sc = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending;
                return (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 16px", borderRadius: 10,
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    marginBottom: 20
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                    <span style={{ color: sc.color, fontWeight: 700, fontSize: 14 }}>{sc.label}</span>
                    <span style={{ color: sc.color, fontSize: 12, opacity: 0.8 }}>
                      {selected.status === "pending"  && "— Our team is reviewing your request"}
                      {selected.status === "approved" && "— Your order has been approved!"}
                      {selected.status === "rejected" && "— Please contact us for more info"}
                    </span>
                  </div>
                );
              })()}

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
                <MRow label="Item Type"   value={selected.itemType} />
                <MRow label="Color"       value={selected.color} />
                <MRow label="Yarn Type"   value={selected.yarnType} />
                <MRow label="Size"        value={selected.size} />
                <MRow label="Quantity"    value={selected.quantity} />
                <MRow label="Gift Wrap"   value={selected.giftWrap ? "Yes" : "No"} />
                <MRow label="Recipient"   value={selected.recipientName} />
                <MRow label="Occasion"    value={selected.occasion} />
                <MRow label="Payment"     value={selected.paymentStatus ?? "unpaid"} />
                {selected.totalAmount > 0 && (
                  <MRow label="Total Amount" value={`₹${selected.totalAmount.toLocaleString("en-IN")}`} />
                )}
                {selected.customText && (
                  <MRow label="Custom Text" value={`"${selected.customText}"`} full />
                )}
                {selected.specialInstructions && (
                  <MRow label="Special Instructions" value={selected.specialInstructions} full />
                )}
                <MRow
                  label="Placed On" full
                  value={new Date(selected.createdAt).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                />
              </div>

              {/* Modal Actions — Pay only if approved and not paid */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selected.status === "approved" && selected.paymentStatus !== "paid" && (
                  <button
                    onClick={() => { setSelected(null); setPaymentOrder(selected); }}
                    style={{
                      flex: 1, background: "linear-gradient(135deg, #6f4e37, #8b5e3c)",
                      color: "#fff", border: "none", borderRadius: 10,
                      padding: "13px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer"
                    }}
                  >💳 Proceed to Payment</button>
                )}
                {selected.status === "pending" && (
                  <button
                    onClick={() => { handleCancel(selected._id); setSelected(null); }}
                    style={{
                      flex: 1, background: "#fef2f2", color: "#b91c1c",
                      border: "1px solid #fecaca", borderRadius: 10,
                      padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer"
                    }}
                  >❌ Cancel Order</button>
                )}
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{
                  width: "100%", marginTop: 10,
                  background: "#f5ede3", border: "1px solid #e3cfc0",
                  borderRadius: 10, padding: 12,
                  fontSize: 14, color: "#6f4e37", fontWeight: 600, cursor: "pointer"
                }}
              >Close</button>
            </div>
          </div>
        )}

        {/* ── Payment Modal ── */}
        {paymentOrder && (
          <PaymentModal
            order={paymentOrder}
            onClose={() => setPaymentOrder(null)}
            onPay={handlePay}
          />
        )}

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, right: 24,
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 20px", borderRadius: 10,
            fontSize: 14, fontWeight: 500, zIndex: 9999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            animation: "slideUp 0.3s ease", maxWidth: 340,
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: toast.type === "success" ? "#15803d" : "#b91c1c"
          }}>
            {toast.type === "success" ? "✅" : "❌"} {toast.message}
          </div>
        )}
      </div>
    );
  }