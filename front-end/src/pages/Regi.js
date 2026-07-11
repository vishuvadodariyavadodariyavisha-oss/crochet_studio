import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styless/regi.css";

export default function Regi() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");
  const [agree, setAgree] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill required fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (!agree) {
      alert("Please accept Terms & Conditions");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("phone", phone);
      formData.append("addresses", JSON.stringify([
        { street, city, state: stateName, zip, isDefault: true }
      ]));
      if (profileImage) formData.append("profileImage", profileImage);

      const res = await fetch("http://localhost:5000/api/user/registerUser", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert("Registration Successful!");
        navigate("/Login");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="regi-overlay">
      <div className="regi-card">

        {/* HEADER */}
        <div className="regi-header">
          <button className="regi-close" onClick={() => setShow(false)}>×</button>

          <div className="avatar-wrapper">
            <div className="avatar-ring" />
            <div className="avatar-inner" onClick={() => fileInputRef.current.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Upload Photo</span>
                </div>
              )}
              <div className="avatar-overlay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Change</span>
              </div>
            </div>
            <div className="avatar-badge" onClick={() => fileInputRef.current.click()}>+</div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />

          <h2>Create Your Account</h2>
          <p>Join us and begin your journey today</p>
        </div>

        {/* BODY */}
        <div className="regi-body">

          <SectionHead icon="person" title="Personal Info" />

          <RegiField label="Full Name *">
            <input type="text" placeholder="e.g. Arjun Sharma" value={name} onChange={e => setName(e.target.value)} />
          </RegiField>
          <RegiField label="Email Address *">
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </RegiField>
          <RegiField label="Phone Number">
            <input type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
          </RegiField>

          <SectionHead icon="lock" title="Security" />

          <RegiField label="Password *">
            <input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </RegiField>
          <RegiField label="Confirm Password *">
            <input type="password" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </RegiField>

          <SectionHead icon="home" title="Address" />

          <RegiField label="Street">
            <input type="text" placeholder="123 Main Street, Apt 4B" value={street} onChange={e => setStreet(e.target.value)} />
          </RegiField>

          <div className="row-2">
            <RegiField label="City">
              <input type="text" placeholder="Surat" value={city} onChange={e => setCity(e.target.value)} />
            </RegiField>
            <RegiField label="State">
              <input type="text" placeholder="Gujarat" value={stateName} onChange={e => setStateName(e.target.value)} />
            </RegiField>
          </div>

          <RegiField label="ZIP Code">
            <input type="text" placeholder="395001" value={zip} onChange={e => setZip(e.target.value)} />
          </RegiField>

          <div className="terms-row">
            <input type="checkbox" className="custom-cb" id="terms" checked={agree} onChange={() => setAgree(!agree)} />
            <label htmlFor="terms">
              I agree to the <Link to="/Terms">Terms & Conditions</Link> and <Link to="/Privacy">Privacy Policy</Link>.
            </label>
          </div>

          <button className="submit-btn" onClick={handleRegister} disabled={loading}>
            {loading ? "Creating Account..." : "Create My Account"}
          </button>

          <p className="regi-footer">
            Already have an account? <Link to="/Login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div className="sec-head">
      <span className="sec-title">{title}</span>
      <div className="sec-line" />
    </div>
  );
}

function RegiField({ label, children }) {
  return (
    <div className="regi-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
