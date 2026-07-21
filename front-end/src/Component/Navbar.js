import React, { useContext, useEffect, useState ,useCallback} from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import "./navbar.css";

const BASE_URL = "http://localhost:5000/api";

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded._id ?? decoded.id ?? decoded.userId ?? null;
  } catch { return null; }
};

export default function Navbar() {
  const navigate = useNavigate();
  const { isUser, isAdmin, logout, userToken } = useContext(AuthContext);

  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount,     setCartCount]     = useState(0);

 const fetchCounts = useCallback(async () => {
  if (!isUser || !userToken) {
    setWishlistCount(0);
    setCartCount(0);
    return;
  }

  const userId = getUserIdFromToken(userToken);
  if (!userId) return;

  const headers = { Authorization: `Bearer ${userToken}` };

  try {
    const res = await fetch(
      `${BASE_URL}/wishlist/getUserWishlist/${userId}`,
      { headers }
    );
    const data = await res.json();
    setWishlistCount(data.data?.length ?? 0);
  } catch {
    setWishlistCount(0);
  }

  try {
    const res = await fetch(
      `${BASE_URL}/cart/getUserCart/${userId}`,
      { headers }
    );
    const data = await res.json();
    const count = (data.products ?? []).reduce(
      (sum, item) => sum + (item.quantity || 1),
      0
    );
    setCartCount(count);
  } catch {
    setCartCount(0);
  }
}, [fetchCounts]);

  useEffect(() => {
    fetchCounts();
  }, [isUser, userToken]);

  const handleLogout = () => {
    logout();
    setWishlistCount(0);
    setCartCount(0);
    navigate("/");
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar text-center">
        Free shipping on orders over ₹999 🧶
      </div>

      <nav className="navbar navbar-expand-lg custom-navbar px-4">

        {/* Brand */}
        <Link className="navbar-brand crochet-logo" to="/">
          Crochet Studio 🧵
        </Link>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse justify-content-center" id="navbarContent">
          <ul className="navbar-nav">

            <li className="nav-item mx-3">
              <Link className="nav-link" to="/">Home</Link>
            </li>

            {!isAdmin && (
              <>
                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/product">Shop</Link>
                </li>

                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/CustomizeOrder">Customize</Link>
                </li>

                <li className="nav-item mx-3">
                  <Link className="nav-link" to="/BulkOrder">Bulk Order</Link>
                </li>
              </>
            )}

            <li className="nav-item mx-3">
              <Link className="nav-link" to="/AboutUs">About</Link>
            </li>

            <li className="nav-item mx-3">
              <Link className="nav-link" to="/Contact">Contact</Link>
            </li>

          </ul>
        </div>

        {/* Right Side */}
        <div className="ms-auto d-flex align-items-center gap-4">

          {isUser && (
            <>
              {/* Wishlist */}
              <Link to="/wishlist" className="icon-link position-relative">
                <i className="bi bi-heart-fill"></i>
                {wishlistCount > 0 && (
                  <span className="count-badge">{wishlistCount}</span>
                )}
              </Link>

              {/* Cart */}
              <Link to="/Cart" className="icon-link position-relative">
                <i className="bi bi-bag-fill"></i>
                {cartCount > 0 && (
                  <span className="count-badge">{cartCount}</span>
                )}
              </Link>

              {/* Profile */}
              <Link to="/BuyerPro" className="icon-link">
                <i className="bi bi-person-circle"></i>
              </Link>
            </>
          )}

          {!isUser && !isAdmin && (
            <Link to="/login" className="btn login-btn">Login</Link>
          )}

          {(isUser || isAdmin) && (
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          )}

        </div>

      </nav>
    </>
  );
}