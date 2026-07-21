import React, { useState, useEffect ,useContext} from "react";
import "../styless/product.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function Product() {
  const navigate = useNavigate();

  const [products,         setProducts]         = useState([]);
  const [categories,       setCategories]       = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [wishlist,         setWishlist]         = useState([]);
  const [userId,           setUserId]           = useState(null);
  // const [userToken,        setUserToken]        = useState(null);
  const [cartAdded,        setCartAdded]        = useState({}); // productId → true/false
  const [toastMsg,         setToastMsg]         = useState(null);

  // ── Toast helper ────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  };

  // ── Get userId from token ────────────────────────────────────────
  // useEffect(() => {
  //   const token = localStorage.getItem("userToken");
  //   if (token) {
  //     try {
  //       const decoded = jwtDecode(token);
  //       setUserId(decoded.id ?? decoded._id ?? decoded.userId);
  //       // setUserToken(token);
  //     } catch (err) {
  //       console.log("Token Decode Error:", err);
  //     }
  //   }
  // }, []);
useEffect(() => {
  if (!userToken) {
    setUserId(null);
    return;
  }

  try {
    const decoded = jwtDecode(userToken);
    setUserId(decoded.id ?? decoded._id ?? decoded.userId);
  } catch (err) {
    console.log("Token Decode Error:", err);
    setUserId(null);
  }
}, [userToken]);

  // ── Fetch Categories ─────────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res  = await fetch("http://localhost:5000/api/category/categories");
        const data = await res.json();
        if (data?.data) setCategories(data.data);
      } catch (error) {
        console.log("Category Fetch Error:", error);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch Products ───────────────────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = selectedCategory
          ? `http://localhost:5000/api/product/getProductsByCategory/${selectedCategory}`
          : "http://localhost:5000/api/product/getAllProducts";

        const res  = await fetch(url);
        const data = await res.json();
        setProducts(data?.success ? data.products : []);
      } catch (error) {
        console.log("Product Fetch Error:", error);
        setProducts([]);
      }
    };
    fetchProducts();
  }, [selectedCategory]);

  // ── Fetch Wishlist ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const fetchWishlist = async () => {
      try {
        const res  = await fetch(`http://localhost:5000/api/wishlist/getUserWishlist/${userId}`);
        const data = await res.json();
        if (data?.data) {
          setWishlist(data.data.map((item) => item.productId._id ?? item.productId));
        }
      } catch (error) {
        console.log("Wishlist Fetch Error:", error);
      }
    };
    fetchWishlist();
  }, [userId]);

  // ── Toggle Wishlist ──────────────────────────────────────────────
  const toggleWishlist = async (productId, e) => {
    e.stopPropagation();
    if (!userId) {
      showToast("Please login to use wishlist", "error");
      setTimeout(() => navigate("/login"), 800);
      return;
    }
    try {
      const res  = await fetch("http://localhost:5000/api/wishlist/toggle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, productId }),
      });
      const data = await res.json();
      if (data.status === "added") {
        setWishlist((prev) => [...prev, productId]);
        showToast("Added to wishlist ❤️");
      } else if (data.status === "removed") {
        setWishlist((prev) => prev.filter((id) => id !== productId));
        showToast("Removed from wishlist 💔");
      }
    } catch (error) {
      console.log("Wishlist Error:", error);
    }
  };

  // ── Add to Cart ──────────────────────────────────────────────────
  // ✅ Variant support: first active variant use karo
  const addToCart = async (product, e) => {
    e.stopPropagation();

    if (!userId) {
      showToast("Please login to add to cart", "error");
      setTimeout(() => navigate("/login"), 800);
      return;
    }

    // ✅ Available stock check on product page
    const activeVariant = product.variants?.find((v) => v.isActive);

    // available stock check
    if (activeVariant) {
      const available = Math.max(
        0,
        (activeVariant.stockQuantity || 0) - (activeVariant.reservedQuantity || 0)
      );
      if (available <= 0) {
        showToast("This item is out of stock ❌", "error");
        return;
      }
    } else {
      const available = Math.max(
        0,
        (product.stockQuantity || 0) - (product.reservedQuantity || 0)
      );
      if (available <= 0) {
        showToast("This item is out of stock ❌", "error");
        return;
      }
    }

    try {
      const res = await fetch("http://localhost:5000/api/cart/addToCart", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId: product._id,
          quantity:  1,
          // ✅ variantId send karo — backend stock check mate
          variantId: activeVariant?._id ?? undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCartAdded((prev) => ({ ...prev, [product._id]: true }));
        showToast("Added to cart! 🛒");
        // 2 sec pachhi badge reset
        setTimeout(() => {
          setCartAdded((prev) => ({ ...prev, [product._id]: false }));
        }, 2000);
      } else {
        showToast(data.message || "Failed to add to cart", "error");
      }
    } catch (error) {
      console.log("Add To Cart Error:", error);
      showToast("Network error", "error");
    }
  };

  // ── Get display price ────────────────────────────────────────────
  const getPrice = (product) => {
    const activeVar = product.variants?.find((v) => v.isActive);
    const price     = activeVar?.price ?? product.basePrice ?? 0;
    const discount  = activeVar?.discount ?? product.discount ?? 0;
    const final     = Math.round(price - (price * discount) / 100);
    return { final, original: discount > 0 ? price : null, discount };
  };

  // ── Get available stock for display ─────────────────────────────
  const getStockStatus = (product) => {
    const activeVar = product.variants?.find((v) => v.isActive);
    if (activeVar) {
      return Math.max(0, (activeVar.stockQuantity || 0) - (activeVar.reservedQuantity || 0));
    }
    return Math.max(0, (product.stockQuantity || 0) - (product.reservedQuantity || 0));
  };

  return (
    <div className="product-page">

      <div className="shop-hero text-center">
        <h2>Shop All Creations</h2>
        <p>Explore our curated collection of handmade crochet items.</p>
      </div>

      <div className="container-fluid">
        <div className="row">

          {/* Sidebar */}
          <div className="col-md-3 sidebar">
            <h5>Filters</h5>
            <div className="filter-section">
              <h6>Categories</h6>
              <ul>
                <li
                  onClick={() => setSelectedCategory(null)}
                  className={!selectedCategory ? "active" : ""}
                  style={{ cursor: "pointer" }}
                >
                  All
                </li>
                {categories.map((cat) => (
                  <li
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={selectedCategory === cat._id ? "active" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    {cat.categoryName}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Products Grid */}
          <div className="col-md-9">
            <div className="row g-4">
              {products.length > 0 ? (
                products.map((product) => {
                  const { final, original, discount } = getPrice(product);
                  const stockAvailable = getStockStatus(product);
                  const isOutOfStock   = stockAvailable <= 0;
                  const isAdded        = cartAdded[product._id];

                  return (
                    <div key={product._id} className="col-md-4">
                      <div
                        className="product-card"
                        onClick={() => navigate(`/productDetail/${product._id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Wishlist heart */}
                        <span
                          className={`wishlist-icon ${wishlist.includes(product._id) ? "active" : ""}`}
                          onClick={(e) => toggleWishlist(product._id, e)}
                        >
                          ♥
                        </span>

                        {/* Out of stock badge */}
                        {isOutOfStock && (
                          <span className="out-of-stock-badge">Out of Stock</span>
                        )}

                        {/* Discount badge */}
                        {discount > 0 && !isOutOfStock && (
                          <span className="discount-badge">{discount}% OFF</span>
                        )}

                        <img
                          src={
                            product.images?.length > 0
                              ? `http://localhost:5000/${product.images[0].replace(/\\/g, "/")}`
                              : "/no-image.png"
                          }
                          alt={product.productName}
                        />

                        <h6 className="mt-3">{product.productName}</h6>

                        {/* Price */}
                        <div className="price-row">
                          <span className="price">₹{final.toLocaleString("en-IN")}</span>
                          {original && (
                            <span className="original-price">
                              ₹{original.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {/* Low stock warning */}
                        {!isOutOfStock && stockAvailable <= 5 && (
                          <p className="low-stock-text">⚡ Only {stockAvailable} left!</p>
                        )}

                        {/* Add to Cart button */}
                        <button
                          className={`btn add-btn w-100 ${isAdded ? "btn-added" : ""}`}
                          onClick={(e) => addToCart(product, e)}
                          disabled={isOutOfStock || isAdded}
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : isAdded
                            ? "✓ Added!"
                            : "Add to Cart"}
                        </button>

                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center mt-5">
                  <h5>No products found</h5>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className={`product-toast product-toast-${toastMsg.type}`}>
          {toastMsg.type === "error" ? "❌" : "✅"} {toastMsg.msg}
        </div>
      )}

    </div>
  );
}