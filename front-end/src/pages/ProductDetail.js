import React, { useState, useEffect } from "react";
import "../styless/productdetail.css";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";

const BASE_URL = "http://localhost:5000/";

// ── Safe JSON parse — prevents "<!DOCTYPE" crash when backend returns HTML ────
const safeJson = async (res) => {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  await res.text();

  const statusMessages = {
    404: "API route not found (404). Please check server route registration.",
    500: "Internal server error (500). Check backend logs.",
  };

  throw new Error(
    statusMessages[res.status] ||
    `Server error (${res.status}): Route may not be registered.`
  );
};

const toImgUrl = (path) => {
  if (!path) return "";
  return BASE_URL + path.replace(/\\/g, "/");
};

const sizeLabel = (size) => {
  if (!size) return "";
  const map = {
    s: "Small", m: "Medium", l: "Large", xl: "Extra Large", xxl: "XX-Large",
    small: "Small", medium: "Medium", large: "Large",
  };
  return map[size.toLowerCase()] || size;
};

// Decode JWT token to get userId
const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded._id || decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
};

export default function ProductDetail() {
  const customizationCharge = 100;
  const navigate = useNavigate();
  const { productId } = useParams();
  const { userToken } = useAuth();
  const { incrementCartCount } = useCart();

  const userId = getUserIdFromToken(userToken);

  // ── Product State ──────────────────────────────────────────────
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [isCustomized, setIsCustomized] = useState(false);
  const [customText, setCustomText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");

  // ── Cart State ─────────────────────────────────────────────────
  const [cartLoading, setCartLoading] = useState(false);
  const [cartToast, setCartToast] = useState(null); // "success" | "error" | "already"

  // ── Review State ───────────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Bulk Order State (commented out — using redirect instead) ──
  // const [showBulkModal, setShowBulkModal] = useState(false);
  // const [bulkLoading, setBulkLoading] = useState(false);
  // const [bulkSuccess, setBulkSuccess] = useState(false);
  // const [bulkError, setBulkError] = useState(null);
  // const [bulkForm, setBulkForm] = useState({
  //   quantity: 10, customText: "", selectedSize: "",
  //   instructions: "", eventType: "", deliveryDate: "",
  // });

  // ── Fetch Product ──────────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BASE_URL}api/product/getProductById/${productId}`);
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data?.message || "Failed to fetch product");
        const prod = data.product || data;
        setProduct(prod);

        if (prod.images?.length > 0) setMainImage(toImgUrl(prod.images[0]));

        const activeVariants = (prod.variants || []).filter((v) => v.isActive);
        if (activeVariants.length > 0) setSelectedVariant(activeVariants[0]);

        if (prod.color?.length > 0) setSelectedColor(prod.color[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId]);

  // ── Fetch Reviews ──────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const res = await fetch(`${BASE_URL}api/review/getReviewsByProduct/${productId}`);
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data?.message || "Failed to fetch reviews");
        setReviews(data.reviews || data || []);
      } catch (err) {
        setReviewsError(err.message);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  // ── Price Calculations ─────────────────────────────────────────
  const getDiscountedPrice = (price, discount) => {
    if (!price) return 0;
    return Math.round(price - (price * (discount || 0)) / 100);
  };

  const basePrice = selectedVariant
    ? getDiscountedPrice(selectedVariant.price, selectedVariant.discount)
    : getDiscountedPrice(product?.basePrice, product?.discount);

  const finalPrice = (basePrice + (isCustomized ? customizationCharge : 0)) * quantity;

  // ── Average Rating ─────────────────────────────────────────────
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  const renderAverageStars = (avg) => {
    if (!avg) return "☆☆☆☆☆";
    const full = Math.floor(avg);
    const half = avg - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
  };

  const renderStars = (rating) => "★".repeat(rating) + "☆".repeat(5 - rating);

  // ── Show Toast Helper ──────────────────────────────────────────
  const showCartToast = (type) => {
    setCartToast(type);
    setTimeout(() => setCartToast(null), 3000);
  };

  // ── Add To Cart ────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      setCartLoading(true);

      const payload = {
        userId,
        productId,
        quantity,
        variantId: selectedVariant?._id || null,
      };

      const res = await fetch(`${BASE_URL}api/cart/addToCart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        if (data?.message?.toLowerCase().includes("already")) {
          showCartToast("already");
        } else {
          showCartToast("error");
        }
        return;
      }

      incrementCartCount();
      showCartToast("success");
    } catch {
      showCartToast("error");
    } finally {
      setCartLoading(false);
    }
  };

  // ── Buy Now ────────────────────────────────────────────────────
const handleBuyNow = () => {
  if (!userId) { navigate("/login"); return; }
  
  navigate("/checkout", {
    state: {
      buyNow: {
        productId,
        variantId:  selectedVariant?._id || null,
        name:       product.productName,
        price:      basePrice,
        quantity,
        img:        mainImage || "/no-image.png",
      }
    }
  });
};

  // ── Submit Review ──────────────────────────────────────────────
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!userId) {
      setSubmitError("Please login to post a review.");
      return;
    }
    if (!newUserName.trim() || !newReviewText.trim()) {
      setSubmitError("Please enter both name and review text!");
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitSuccess(false);

      const res = await fetch(`${BASE_URL}api/review/addReview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          productId,
          userId,
          userName: newUserName.trim(),
          rating: newRating,
          reviewText: newReviewText.trim(),
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to submit review");
      setReviews((prev) => [data.review || data, ...prev]);
      setNewUserName("");
      setNewReviewText("");
      setNewRating(5);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Bulk Order Submit (commented out — using redirect instead) ─
  // const handleBulkOrderSubmit = async (e) => {
  //   e.preventDefault();
  //   setBulkError(null);
  //
  //   if (!userId) {
  //     navigate("/login");
  //     return;
  //   }
  //
  //   if (bulkForm.quantity < 10) {
  //     setBulkError("Minimum quantity for bulk order is 10.");
  //     return;
  //   }
  //
  //   try {
  //     setBulkLoading(true);
  //     setBulkSuccess(false);
  //
  //     const res = await fetch(`${BASE_URL}api/bulkOrder/create`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${userToken}`,
  //       },
  //       body: JSON.stringify({
  //         userId,
  //         productId,
  //         quantity: bulkForm.quantity,
  //         customText: bulkForm.customText,
  //         selectedSize: bulkForm.selectedSize,
  //         instructions: bulkForm.instructions,
  //         eventType: bulkForm.eventType,
  //         deliveryDate: bulkForm.deliveryDate || null,
  //       }),
  //     });
  //
  //     const bulkData = await safeJson(res);
  //     if (!res.ok) throw new Error(bulkData?.message || "Failed to place bulk order");
  //
  //     setBulkSuccess(true);
  //     setBulkForm({
  //       quantity: 10, customText: "", selectedSize: "",
  //       instructions: "", eventType: "", deliveryDate: "",
  //     });
  //     setTimeout(() => {
  //       setBulkSuccess(false);
  //       setShowBulkModal(false);
  //     }, 2500);
  //   } catch (err) {
  //     setBulkError(err.message);
  //   } finally {
  //     setBulkLoading(false);
  //   }
  // };

  const allImages = product?.images?.map(toImgUrl) || [];
  const activeVariants = (product?.variants || []).filter((v) => v.isActive);

  // ── Loading / Error States ─────────────────────────────────────
  if (loading) {
    return (
      <div className="detail-wrapper d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border text-secondary mb-3" role="status"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="detail-wrapper d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center text-danger">
          <p>⚠️ {error || "Product not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-wrapper">

      {/* ── Cart Toast Notification ──────────────────────────────── */}
      {cartToast && (
        <div
          style={{
            position: "fixed", top: "20px", right: "20px", zIndex: 9999,
            minWidth: "260px", borderRadius: "10px", padding: "14px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            backgroundColor:
              cartToast === "success" ? "#d4edda" :
              cartToast === "already" ? "#fff3cd" : "#f8d7da",
            color:
              cartToast === "success" ? "#155724" :
              cartToast === "already" ? "#856404" : "#721c24",
            fontWeight: "500",
            transition: "all 0.3s ease",
          }}
        >
          {cartToast === "success" && "🛒 Added to cart successfully!"}
          {cartToast === "already" && "⚠️ Item already in your cart!"}
          {cartToast === "error"   && "❌ Failed to add to cart. Try again."}
        </div>
      )}

      <div className="container py-5">
        <div className="row">

          {/* LEFT: Images */}
          <div className="col-lg-6">
            <div className="sticky-image">
              {mainImage ? (
                <img src={mainImage} alt={product.productName} className="detail-img" />
              ) : (
                <div className="detail-img d-flex align-items-center justify-content-center bg-light" style={{ height: "400px" }}>
                  <span className="text-muted">No Image Available</span>
                </div>
              )}

              {allImages.length > 1 && (
                <div className="d-flex gap-2 mt-3 flex-wrap">
                  {allImages.map((img, idx) => (
                    <img
                      key={idx} src={img} alt={`thumb-${idx}`}
                      onClick={() => setMainImage(img)}
                      style={{
                        width: "72px", height: "72px", objectFit: "cover",
                        cursor: "pointer", borderRadius: "8px",
                        border: mainImage === img ? "2px solid #8B5E3C" : "2px solid #ddd",
                        transition: "border 0.2s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Details */}
          <div className="col-lg-6">
            <div className="detail-content">

              <span className="category">{product.categoryId?.categoryName || "Crochet Studio"}</span>

              <h2 className="title" style={{ textTransform: "capitalize" }}>
                {product.productName}
              </h2>

              {/* Average Rating */}
              <div className="rating d-flex align-items-center gap-2">
                <span className="star-color fs-5">{renderAverageStars(parseFloat(averageRating))}</span>
                {averageRating && <span className="fw-semibold">{averageRating}</span>}
                <span className="text-muted">({reviews.length} {reviews.length === 1 ? "Review" : "Reviews"})</span>
              </div>

              {/* Price */}
              <div className="d-flex align-items-center gap-3 mt-2 mb-4">
                <h3 className="price mb-0">₹{basePrice.toLocaleString("en-IN")}</h3>
                {(selectedVariant?.discount || product?.discount) > 0 && (
                  <>
                    <span className="text-muted text-decoration-line-through fs-5">
                      ₹{(selectedVariant?.price || product?.basePrice)?.toLocaleString("en-IN")}
                    </span>
                    <span className="badge bg-success fs-6">
                      {selectedVariant?.discount || product?.discount}% OFF
                    </span>
                  </>
                )}
              </div>

              <div className="extra-info">
                <h5>Product Details</h5>
                <p className="mb-1">
                  {product.material && (<><strong>Material:</strong> {product.material}<br /></>)}
                  {selectedVariant?.size && (<><strong>Size:</strong> {sizeLabel(selectedVariant.size)}<br /></>)}
                  {selectedVariant?.layers && (<><strong>Layers:</strong> {selectedVariant.layers}<br /></>)}
                  {selectedVariant?.petalType && (<><strong>Petal Type:</strong> {selectedVariant.petalType}<br /></>)}
                  <strong>Handmade</strong> with care &nbsp;•&nbsp;{" "}
                  <strong>Eco-friendly</strong> &amp; Sustainable
                </p>

                <h5 className="mt-3">Product Description</h5>
                <p className="desc">{product.description}</p>

                <div className="feature-badges mt-4">
                  <div className="feature-item"><div className="icon-circle">↩</div><span>Easy Return</span></div>
                  <div className="feature-item"><div className="icon-circle">💵</div><span>Cash on Delivery</span></div>
                  <div className="feature-item"><div className="icon-circle">🧶</div><span>Handmade</span></div>
                  <div className="feature-item"><div className="icon-circle">🚚</div><span>Free Delivery</span></div>
                </div>
              </div>

              {/* Variant Selection */}
              {activeVariants.length > 0 && (
                <div className="mb-3 mt-4">
                  <label className="form-label fw-semibold">Select Variant</label>
                  <div className="d-flex flex-wrap gap-2">
                    {activeVariants.map((v) => (
                      <button
                        key={v._id}
                        onClick={() => setSelectedVariant(v)}
                        className={`btn btn-sm ${selectedVariant?._id === v._id ? "btn-brown" : "btn-outline-secondary"}`}
                        style={{ borderRadius: "20px", fontSize: "13px" }}
                      >
                        {[v.size ? sizeLabel(v.size) : null, v.layers || null, v.petalType || null]
                          .filter(Boolean).join(" • ")}
                        {" — ₹"}{getDiscountedPrice(v.price, v.discount)}
                      </button>
                    ))}
                  </div>
                  {selectedVariant && (
                    <small className="text-muted mt-1 d-block">
                      Stock: {selectedVariant.stockQuantity} available &nbsp;|&nbsp; SKU: {selectedVariant.sku}
                    </small>
                  )}
                </div>
              )}

              {/* Color Selection */}
              {product.color?.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Color: <span style={{ textTransform: "capitalize", fontWeight: "normal" }}>{selectedColor}</span>
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {product.color.map((c, i) => (
                      <button
                        key={i} onClick={() => setSelectedColor(c)}
                        className={`btn btn-sm ${selectedColor === c ? "btn-brown" : "btn-outline-secondary"}`}
                        style={{ borderRadius: "20px", textTransform: "capitalize", fontSize: "13px" }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Quantity</label>
                <input
                  type="number" min="1" className="form-control" value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  style={{ maxWidth: "130px" }}
                />
              </div>

              {/* Customization */}
              {product.isCustomizable && (
                <div className="mb-3 p-3 border rounded">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input" type="checkbox"
                      checked={isCustomized} onChange={() => setIsCustomized(!isCustomized)}
                    />
                    <label className="form-check-label fw-semibold">
                      Customize This Product (+₹{customizationCharge})
                    </label>
                  </div>
                  {isCustomized && (
                    <>
                      <input
                        type="text" className="form-control mb-2"
                        placeholder="Enter name / text for customization"
                        value={customText} onChange={(e) => setCustomText(e.target.value)}
                      />
                      <textarea
                        className="form-control" placeholder="Special instructions"
                        value={instruction} onChange={(e) => setInstruction(e.target.value)}
                      ></textarea>
                    </>
                  )}
                </div>
              )}

              {/* Total Price */}
              <h5 className="mb-3">
                Total Price: <span className="text-brown">₹{finalPrice.toLocaleString("en-IN")}</span>
              </h5>

              {/* ── Action Buttons ─────────────────────────────────── */}
              <div className="d-flex gap-3 mt-3">
                <button
                  className="btn btn-brown flex-fill"
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                >
                  {cartLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Adding...</>
                  ) : (
                    "🛒 Add to Cart"
                  )}
                </button>
                <button
                  className="btn btn-outline-brown flex-fill"
                  onClick={handleBuyNow}
                  disabled={cartLoading}
                >
                  Buy Now
                </button>
              </div>

              {/* ── Bulk Order Button ──────────────────────────────── */}
              <div className="p-bulk-order mt-3 border-top pt-3">
                <p>For bulk order minimum quantity is 10 PCs.</p>
                <button
                  className="btn btn-bulk-active"
                  onClick={() => {
                    if (!userId) {
                      navigate("/login");
                      return;
                    }
                    navigate(`/BulkOrder/${productId}`);
                  }}
                >
                  Bulk Order
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── REVIEW SECTION ───────────────────────────────────────── */}
        <div className="row mt-5 pt-5 border-top">

          {/* Submit Review Form */}
          <div className="col-md-5 mb-5">
            <h4 className="mb-4">Share your experience</h4>

            {!userId && (
              <div className="alert alert-warning py-2 mb-3">
                ⚠️ Please <strong>login</strong> to post a review.
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="p-4 border rounded bg-light">
              {submitSuccess && (
                <div className="alert alert-success py-2 mb-3">✅ Review posted successfully!</div>
              )}
              {submitError && (
                <div className="alert alert-danger py-2 mb-3">⚠️ {submitError}</div>
              )}

              <div className="mb-3">
                <label className="form-label">Your Name</label>
                <input
                  type="text" className="form-control" value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter your name" disabled={submitLoading || !userId}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Rating</label>
                <select
                  className="form-select" value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  disabled={submitLoading || !userId}
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="1">⭐ 1 Star</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Your Review</label>
                <textarea
                  className="form-control" rows="3" value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="What did you like?" disabled={submitLoading || !userId}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-brown w-100" disabled={submitLoading || !userId}>
                {submitLoading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Posting...</>
                ) : "Post Review"}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="col-md-7">
            <h4 className="mb-4">
              Customer Stories ({reviews.length})
              {averageRating && (
                <span className="ms-3 fs-5 fw-normal text-muted">
                  <span className="star-color">{renderAverageStars(parseFloat(averageRating))}</span>{" "}
                  {averageRating} / 5
                </span>
              )}
            </h4>

            {reviewsLoading && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>
                <span className="text-muted">Loading reviews...</span>
              </div>
            )}

            {reviewsError && !reviewsLoading && (
              <div className="alert alert-warning py-2">⚠️ Could not load reviews: {reviewsError}</div>
            )}

            {!reviewsLoading && !reviewsError && (
              reviews.length === 0 ? (
                <p className="text-muted">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="review-list" style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {reviews.map((rev, idx) => (
                    <div key={rev._id || idx} className="card p-3 mb-3 border-0 border-bottom rounded-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold">{rev.userName}</h6>
                        <small className="text-muted">
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : ""}
                        </small>
                      </div>
                      <div className="star-color small my-1">{renderStars(rev.rating)}</div>
                      <p className="text-secondary small mb-0">{rev.reviewText}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* ── BULK ORDER MODAL (commented out — using redirect instead) ── */}
      {/* {showBulkModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBulkModal(false); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">

              <div className="modal-header">
                <h5 className="modal-title fw-bold">🧶 Bulk Order Request</h5>
                <button
                  className="btn-close"
                  onClick={() => { setShowBulkModal(false); setBulkError(null); setBulkSuccess(false); }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded">
                  {mainImage && (
                    <img src={mainImage} alt={product.productName}
                      style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  )}
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ textTransform: "capitalize" }}>
                      {product.productName}
                    </h6>
                    <small className="text-muted">Minimum quantity: 10 pcs</small>
                  </div>
                </div>

                {bulkSuccess && (
                  <div className="alert alert-success">
                    ✅ Bulk order placed successfully! We'll contact you soon.
                  </div>
                )}

                {bulkError && (
                  <div className="alert alert-danger">⚠️ {bulkError}</div>
                )}

                {!bulkSuccess && (
                  <form onSubmit={handleBulkOrderSubmit}>
                    <div className="row g-3">

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Quantity <span className="text-danger">*</span></label>
                        <input
                          type="number" min="10" className="form-control"
                          value={bulkForm.quantity}
                          onChange={(e) => setBulkForm({ ...bulkForm, quantity: Number(e.target.value) })}
                          disabled={bulkLoading}
                        />
                        <small className="text-muted">Minimum 10 pieces</small>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Event Type</label>
                        <input
                          type="text" className="form-control"
                          placeholder="e.g. Wedding, Birthday, Corporate"
                          value={bulkForm.eventType}
                          onChange={(e) => setBulkForm({ ...bulkForm, eventType: e.target.value })}
                          disabled={bulkLoading}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Preferred Delivery Date</label>
                        <input
                          type="date" className="form-control"
                          value={bulkForm.deliveryDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setBulkForm({ ...bulkForm, deliveryDate: e.target.value })}
                          disabled={bulkLoading}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Size Preference</label>
                        <input
                          type="text" className="form-control"
                          placeholder="e.g. Small, Medium, Large"
                          value={bulkForm.selectedSize}
                          onChange={(e) => setBulkForm({ ...bulkForm, selectedSize: e.target.value })}
                          disabled={bulkLoading}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Custom Text / Name</label>
                        <input
                          type="text" className="form-control"
                          placeholder="e.g. Name to print, message to add"
                          value={bulkForm.customText}
                          onChange={(e) => setBulkForm({ ...bulkForm, customText: e.target.value })}
                          disabled={bulkLoading}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Special Instructions</label>
                        <textarea
                          className="form-control" rows="3"
                          placeholder="Color preferences, design details, packaging requirements..."
                          value={bulkForm.instructions}
                          onChange={(e) => setBulkForm({ ...bulkForm, instructions: e.target.value })}
                          disabled={bulkLoading}
                        ></textarea>
                      </div>

                    </div>

                    <div className="d-flex gap-3 mt-4">
                      <button type="submit" className="btn btn-brown flex-fill" disabled={bulkLoading}>
                        {bulkLoading ? (
                          <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Placing Order...</>
                        ) : "Place Bulk Order"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => { setShowBulkModal(false); setBulkError(null); }}
                        disabled={bulkLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )} */}

    </div>
  );
}