import React from "react";
import { Link } from "react-router-dom";
import "./AdminCss/dashboard.css"; // admin specific styling

export default function AdminNavbar() {
  return (
    <nav className="admin-navbar">
      <div className="logo">Admin Panel</div>
      <ul className="nav-links">
        <li><Link to="/Dashboard">Dashboard</Link></li>
        <li><Link to="/UserMang">Users</Link></li>
        <li><Link to="/AdminCategory">Categories</Link></li>
        <li><Link to="/AdminProduct">Products</Link></li>
        <li><Link to="/Adminorder">Orders</Link></li>
        <li><Link to="/AdminCustomization">Cutomized-Order</Link></li>
        <li><Link to="/AdminBulkOrder">Bulk-Order</Link></li>
        <li><Link to="/AdminInventory">Inventory</Link></li>
        <li><Link to="/AdminReport">Reports</Link></li>
        <li><Link to="/AdminReview">Reviews</Link></li>
        {/* <li><Link to="/admin/settings">Settings</Link></li> */}
      </ul>
    </nav>
  );
}
