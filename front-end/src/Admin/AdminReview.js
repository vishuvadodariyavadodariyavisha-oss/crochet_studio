import React, { useState, useEffect } from "react";
import "./AdminCss/adminreviews.css";

const AdminReview = () => {
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch all reviews from backend ───────────────────────────────────────
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:5000/api/review");
      if (!res.ok) throw new Error("Failed to fetch reviews.");
      const data = await res.json();
      // Backend returns { reviews: [...] }
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // ─── Delete review ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/review/deleteReview/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete review.");
      setReviews((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Toggle status (approved ↔ hidden) ───────────────────────────────────
  const handleStatusToggle = async (review) => {
    const newStatus = review.status === "approved" ? "hidden" : "approved";
    try {
      const res = await fetch(
        `http://localhost:5000/api/review/updateStatus/${review._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status.");
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) => (r._id === review._id ? data.review : r))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Client-side filtering ────────────────────────────────────────────────
  const filteredReviews = reviews.filter((review) => {
    const name =
      typeof review.userId === "object"
        ? review.userId?.name || review.userName || ""
        : review.userName || "";
    const product = review.productId?.name || review.productId || "";

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.toString().toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating =
      ratingFilter === "All" || review.rating === Number(ratingFilter);

    const matchesStatus =
      statusFilter === "All" || review.status === statusFilter;

    return matchesSearch && matchesRating && matchesStatus;
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getCustomerName = (review) => {
    if (typeof review.userId === "object" && review.userId?.name)
      return review.userId.name;
    return review.userName || "Unknown";
  };

  const getProductName = (review) => {
    if (typeof review.productId === "object" && review.productId?.name)
      return review.productId.name;
    return review.productId || "—";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-review-page">
      <div className="container-fluid p-4 review-container">
        <h2 className="page-title mb-4">Review Management</h2>

        {/* Search + Filters */}
        <div className="row mb-4">
          <div className="col-md-5 mb-2">
            <input
              type="text"
              className="form-control search-bar"
              placeholder="Search by customer or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="col-md-3 mb-2">
            <select
              className="form-select"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="col-md-3 mb-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-4 text-muted">Loading reviews...</div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}{" "}
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={fetchReviews}>
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="table table-hover review-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <tr key={review._id}>
                      <td>{getCustomerName(review)}</td>
                      <td>{getProductName(review)}</td>
                      <td>{"⭐".repeat(review.rating)}</td>
                      <td className="review-text">{review.reviewText}</td>
                      <td>
                        <span
                          className={`badge ${
                            review.status === "approved"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {review.status}
                        </span>
                      </td>
                      <td>{formatDate(review.createdAt)}</td>
                      <td className="d-flex gap-2 flex-wrap">
                        <button
                          className={`btn btn-sm ${
                            review.status === "approved"
                              ? "btn-outline-secondary"
                              : "btn-outline-success"
                          }`}
                          onClick={() => handleStatusToggle(review)}
                        >
                          {review.status === "approved" ? "Hide" : "Approve"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(review._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No reviews found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReview;