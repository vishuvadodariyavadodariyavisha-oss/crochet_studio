import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/authContext";
import "./AdminCss/adminInventoryManagement.css";

const BASE_URL = "http://localhost:5000/";

const safeJson = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  throw new Error(`Server error (${res.status})`);
};

export default function InventoryManagement() {
  const { userToken } = useContext(AuthContext);

  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId,   setUpdatingId]   = useState(null);
  const [qtyInputs,    setQtyInputs]    = useState({});
  const [toast,        setToast]        = useState(null);

  // ──────────────────────────────────────────────────────
  // Fetch inventory stats (totalAdded, ordersUsed, remaining)
  // ──────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res  = await fetch(`${BASE_URL}api/product/getInventoryStats`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to fetch inventory");
      setRows(data.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ──────────────────────────────────────────────────────
  // Update stock quantity for a variant/product
  // ──────────────────────────────────────────────────────
  const handleUpdateStock = async (productId, variantId, newQty) => {
    if (newQty === "" || newQty === null || isNaN(newQty) || Number(newQty) < 0) {
      showToast("error", "Please enter a valid quantity (0 or more).");
      return;
    }

    const key = String(variantId || productId);
    setUpdatingId(key);
    try {
      const res = await fetch(`${BASE_URL}api/product/updateVariantStock`, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          productId,
          variantId:     variantId || null,
          stockQuantity: Number(newQty),
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update stock");

      showToast("success", "Stock updated successfully!");
      await fetchProducts();
      setQtyInputs((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ──────────────────────────────────────────────────────
  // Stock status based on remaining
  // ──────────────────────────────────────────────────────
  const stockStatus = (remaining) => {
    if (remaining === 0)  return "out";
    if (remaining <= 5)   return "low";
    return "ok";
  };

  // ──────────────────────────────────────────────────────
  // Filter + Search  (same logic, now uses row.remaining)
  // ──────────────────────────────────────────────────────
  const filteredRows = rows.filter((row) => {
    const matchSearch =
      row.productName?.toLowerCase().includes(search.toLowerCase()) ||
      row.sku?.toLowerCase().includes(search.toLowerCase()) ||
      row.category?.toLowerCase().includes(search.toLowerCase());

    const st = stockStatus(row.remaining);
    const matchFilter =
      filterStatus === "all" ? true :
      filterStatus === "low" ? st === "low" :
      st === "out";

    return matchSearch && matchFilter;
  });

  // ──────────────────────────────────────────────────────
  // Summary counts
  // ──────────────────────────────────────────────────────
  const totalItems = rows.length;
  const lowStock   = rows.filter((r) => stockStatus(r.remaining) === "low").length;
  const outOfStock = rows.filter((r) => r.remaining === 0).length;
  const healthy    = totalItems - lowStock - outOfStock;

  return (
    <div className="inv-wrapper">
      {/* Toast */}
      {toast && (
        <div className={`inv-toast inv-toast--${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="inv-header">
        <div>
          <h2 className="inv-title">Inventory Management</h2>
          <p className="inv-subtitle">Monitor and update product stock levels</p>
        </div>
        <button className="inv-refresh-btn" onClick={fetchProducts} disabled={loading}>
          {loading ? "↻ Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* Summary Cards — same as before */}
      <div className="inv-summary-grid">
        <div className="inv-card inv-card--total" onClick={() => setFilterStatus("all")}>
          <span className="inv-card-icon">📦</span>
          <div>
            <p className="inv-card-label">Total SKUs</p>
            <p className="inv-card-value">{totalItems}</p>
          </div>
        </div>
        <div className="inv-card inv-card--ok" onClick={() => setFilterStatus("all")}>
          <span className="inv-card-icon">✅</span>
          <div>
            <p className="inv-card-label">In Stock</p>
            <p className="inv-card-value">{healthy}</p>
          </div>
        </div>
        <div className="inv-card inv-card--low" onClick={() => setFilterStatus("low")}>
          <span className="inv-card-icon">⚠️</span>
          <div>
            <p className="inv-card-label">Low Stock (≤5)</p>
            <p className="inv-card-value">{lowStock}</p>
          </div>
        </div>
        <div className="inv-card inv-card--out" onClick={() => setFilterStatus("out")}>
          <span className="inv-card-icon">🚫</span>
          <div>
            <p className="inv-card-label">Out of Stock</p>
            <p className="inv-card-value">{outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <input
          type="text"
          className="inv-search"
          placeholder="🔍  Search by name, SKU or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="inv-filter-btns">
          {["all", "low", "out"].map((f) => (
            <button
              key={f}
              className={`inv-filter-btn ${filterStatus === f ? "active" : ""} inv-filter-btn--${f}`}
              onClick={() => setFilterStatus(f)}
            >
              {f === "all" ? "All" : f === "low" ? "⚠️ Low Stock" : "🚫 Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <div className="inv-error">⚠️ {error}</div>}

      {/* Table */}
      {loading ? (
        <div className="inv-loading">
          <div className="inv-spinner"></div>
          <p>Loading inventory...</p>
        </div>
      ) : (
        <>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                  {/* ✅ 3 new stock columns */}
                  <th style={{ textAlign: "center" }}>Total Added</th>
                  <th style={{ textAlign: "center" }}>Orders Used</th>
                  <th style={{ textAlign: "center" }}>Remaining</th>
                  <th>Status</th>
                  <th>Update Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="inv-empty-row">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const key       = String(row.variantId || row.productId);
                    const status    = stockStatus(row.remaining);
                    const isUpdating = updatingId === key;
                    const inputVal  = qtyInputs[key] !== undefined ? qtyInputs[key] : "";
                    const imgSrc    = row.images?.[0]
                      ? BASE_URL + row.images[0].replace(/\\/g, "/")
                      : null;

                    return (
                      <tr key={idx} className={`inv-row inv-row--${status}`}>
                        {/* Product */}
                        <td>
                          <div className="inv-product-cell">
                            {imgSrc ? (
                              <img src={imgSrc} alt={row.productName} className="inv-product-img" />
                            ) : (
                              <div className="inv-product-img inv-product-img--placeholder">🧶</div>
                            )}
                            <span className="inv-product-name">{row.productName}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="inv-category-badge">{row.category}</span>
                        </td>

                        {/* Variant */}
                        <td className="inv-variant">{row.label}</td>

                        {/* SKU */}
                        <td>
                          <code className="inv-sku">{row.sku}</code>
                        </td>

                        {/* Price */}
                        <td className="inv-price">
                          ₹{row.price?.toLocaleString("en-IN") || "—"}
                        </td>

                        {/* ✅ Total Added — admin je set kare */}
                        <td style={{ textAlign: "center" }}>
                          <span className="inv-stock-num" style={{ color: "#6366f1", fontWeight: 600 }}>
                            {row.totalAdded}
                          </span>
                        </td>

                        {/* ✅ Orders Used — paid orders mathi gaya */}
                        <td style={{ textAlign: "center" }}>
                          <span className="inv-stock-num" style={{ color: "#f59e0b", fontWeight: 600 }}>
                            {row.ordersUsed}
                          </span>
                        </td>

                        {/* ✅ Remaining — live baaki stock */}
                        <td style={{ textAlign: "center" }}>
                          <span className={`inv-stock-num inv-stock-num--${status}`}>
                            {row.remaining}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {status === "ok"  && <span className="inv-badge inv-badge--ok">✅ In Stock</span>}
                          {status === "low" && <span className="inv-badge inv-badge--low">⚠️ Low Stock</span>}
                          {status === "out" && <span className="inv-badge inv-badge--out">🚫 Out of Stock</span>}
                        </td>

                        {/* Update Stock */}
                        <td>
                          <div className="inv-update-cell">
                            <input
                              type="number"
                              min="0"
                              className="inv-qty-input"
                              placeholder={row.remaining}
                              value={inputVal}
                              onChange={(e) =>
                                setQtyInputs((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              disabled={isUpdating}
                            />
                            <button
                              className="inv-update-btn"
                              onClick={() =>
                                handleUpdateStock(
                                  row.productId,
                                  row.variantId,
                                  inputVal !== "" ? inputVal : row.remaining
                                )
                              }
                              disabled={isUpdating || inputVal === ""}
                              title="Update stock quantity"
                            >
                              {isUpdating ? <span className="inv-btn-spinner"></span> : "Save"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="inv-count">
            Showing {filteredRows.length} of {totalItems} SKUs
          </p>
        </>
      )}
    </div>
  );
}