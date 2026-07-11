import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext"; // Path check kari lejo
import "../styless/login.css";

export default function Login() {
  const { loginAdmin, loginUser } = useContext(AuthContext); // Context use karyu
  const [show, setShow] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!show) return null;

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // --- STEP 1: ADMIN LOGIN ATTEMPT ---
      const adminRes = await fetch("http://localhost:5000/api/admin/loginAdmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const adminData = await adminRes.json();

      if (adminRes.ok && adminData.success) {
        loginAdmin(adminData.token); // Context mathi update thase
        navigate("/Dashboard");
        return;
      }

      // --- STEP 2: USER LOGIN ATTEMPT ---
      const userRes = await fetch("http://localhost:5000/api/user/loginUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const userData = await userRes.json();

      if (userRes.ok && userData.success) {
        loginUser(userData.token); // Context mathi update thase
        navigate("/");
      } else {
        alert(userData.message || adminData.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="login-header">
          <button className="close-btn" onClick={() => setShow(false)}>×</button>
          <div className="login-logo">
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to continue your journey</p>
        </div>

        <div className="login-body">
          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="forgot-row">
            <Link to="/ForgotPassword">Forgot password?</Link>
          </div>

          <button className="primary-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* <div className="divider"><span>OR</span></div>

          <button className="google-btn">
            <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="Google" />
            Continue with Google
          </button>

          <button className="apple-btn">
            <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="Apple" />
            Continue with Apple
          </button> */}

          <p className="switch-text">
            Don't have an account? <span><Link to="/Regi">Sign up here</Link></span>
          </p>
        </div>
      </div>
    </div>
  );
}