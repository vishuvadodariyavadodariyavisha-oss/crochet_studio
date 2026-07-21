import React, { useState, useRef, useEffect,useCallback } from "react";
import "../styless/buyerpro.css";
import { useAuth } from "../context/authContext";

const BASE_URL = "http://localhost:5000/api/user";

export default function BuyerProfile() {
  const { userToken, logout } = useAuth();

  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recentOrders,    setRecentOrders]    = useState([]);

  const [buyer, setBuyer] = useState({
    name:        "",
    email:       "",
    phone:       "",
    address:     "",
    joined:      "",
    totalOrders: 0,
    totalSpent:  0,
    status:      "Member",
    imgSrc:      null,
  });

  const fileInputRef = useRef(null);
  const newImageFile = useRef(null);
  const defaultImg   = "https://i.pravatar.cc/150?img=47";

  // ── Fetch Profile ──────────────────────────────────────────────
  // ✅ Correct order
const fetchProfile = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const res = await fetch(`${BASE_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const d = data.data;

    setBuyer({
      name: d.name || "",
      email: d.email || "",
      phone: d.phone || "",
      address: d.address || "",
      joined: d.joinedDate
        ? new Date(d.joinedDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "",
      totalOrders: d.totalOrders || 0,
      totalSpent: d.totalSpent || 0,
      status: d.status === "premium" ? "Premium Member" : "Member",
      imgSrc: d.profileImage || null,
    });

    setRecentOrders((d.orders || []).slice(0, 3));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [userToken]);

useEffect(() => {
  if (!userToken) return;
  fetchProfile();
}, [fetchProfile]);

  // ── Image Change ───────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    newImageFile.current = file;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setBuyer((prev) => ({ ...prev, imgSrc: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // ── Save Profile ───────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name",  buyer.name);
      formData.append("phone", buyer.phone);
      if (newImageFile.current) {
        formData.append("profileImage", newImageFile.current);
      }
      const res  = await fetch(`${BASE_URL}/update-profile`, {
        method:  "PUT",
        headers: { Authorization: `Bearer ${userToken}` },
        body:    formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      newImageFile.current = null;
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Account ─────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/profile/permanent`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      logout();
    } catch (err) {
      alert(err.message);
    }
  };

  const getOrderAmount = (order) => order.totalAmount ?? order.paidAmount ?? 0;

  const getStatusClass = (status) => {
    switch (status) {
      case "delivered":  return "status-delivered";
      case "cancelled":  return "status-cancelled";
      case "pending":    return "status-pending";
      case "processing": return "status-processing";
      case "shipped":    return "status-shipped";
      default:           return "";
    }
  };

  // ── Loading / Error ────────────────────────────────────────────
  if (loading) return (
    <div className="buyer-container">
      <div className="loader-box">
        <div className="spinner" />
        <p>Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="buyer-container">
      <p style={{ textAlign: "center", padding: "2rem", color: "red" }}>
        Error: {error}
      </p>
    </div>
  );

  // ── Main UI ────────────────────────────────────────────────────
  return (
    <div className="buyer-container">
      <div className="profile-cover" />

      <div className="profile-card">

        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-img-wrapper">
            <img
              src={
                buyer.imgSrc
                  ? buyer.imgSrc
                      .replace(/\\/g, "/")
                      .replace("uploads/users/uploads/users", "uploads/users")
                      .startsWith("data:")
                    ? buyer.imgSrc
                    : `http://localhost:5000/${buyer.imgSrc.replace(/\\/g, "/").replace("uploads/users/uploads/users", "uploads/users")}`
                  : defaultImg
              }
              alt="profile"
              className="profile-img"
              onError={(e) => { if (e.target.src !== defaultImg) e.target.src = defaultImg; }}
            />
            {isEditing && (
              <>
                <div
                  className="img-edit-overlay"
                  onClick={() => fileInputRef.current.click()}
                >
                  Change Photo
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </>
            )}
          </div>

          <div className="profile-info">
            {isEditing ? (
              <input
                type="text"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                className="edit-input name-input"
              />
            ) : (
              <h2>{buyer.name}</h2>
            )}
            <p className="email">{buyer.email}</p>
            <button type="button" className="member-badge">{buyer.status}</button>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="info-grid">
          <div>
            <label>Phone</label>
            {isEditing ? (
              <input
                type="text"
                value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                className="edit-input"
              />
            ) : (
              <p>{buyer.phone || "—"}</p>
            )}
          </div>
          <div>
            <label>Address</label>
            <p>{buyer.address || "—"}</p>
          </div>
          <div>
            <label>Member Since</label>
            <p>{buyer.joined}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-section">
          <div className="stat-box">
            <h3>{buyer.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div className="stat-box">
            <h3>₹{(buyer.totalSpent || 0).toLocaleString("en-IN")}</h3>
            <p>Total Spent</p>
          </div>
        </div>

        {/* RECENT ORDERS */}
        <div className="orders-section">
          <h4>Recent Orders</h4>
          {recentOrders.length === 0 ? (
            <p style={{ color: "#aaa", marginTop: "8px" }}>No orders yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="amount-cell">
                      ₹{getOrderAmount(o).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`order-status-badge ${getStatusClass(o.orderStatus)}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ACTIONS */}
        <div className="profile-actions">
          {!isEditing ? (
            <>
              <button
                type="button"
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="edit-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={() => { setIsEditing(false); fetchProfile(); }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

      </div>

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account?</h3>
            <p>This action cannot be undone. All your data will be permanently removed.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-confirm"
                onClick={handleDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}