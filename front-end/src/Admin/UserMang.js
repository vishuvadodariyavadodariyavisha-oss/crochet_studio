import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/authContext";
import "./AdminCss/usermang.css";

export default function UserManagement() {
  const { adminToken } = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status"); // Added for status filter
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const usersPerPage = 3;

  const BASE_URL = "http://localhost:5000/";

  // Fetch users
  const fetchUsers = async () => {
    if (!adminToken) return;

    try {
      const res = await axios.get(`${BASE_URL}api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setUsers(res.data.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminToken]);

  // UPDATE USER STATUS FUNCTION
  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";

    try {
      await axios.put(
        `${BASE_URL}api/admin/update-user-status/${id}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // ✅ COMBINED FILTER LOGIC (Fixed the duplicate declaration error)
  const filteredUsers = Array.isArray(users)
    ? users.filter((u) => {
        const matchesSearch =
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          filterStatus === "All Status" ||
          u.status.toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesStatus;
      })
    : [];

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`${BASE_URL}api/admin/delete-user/${id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="admin-layout">
      <div className="main-content">
        <div className="user-container">
          <h2>User Management</h2>

          <div className="user-controls">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            {/* ✅ Corrected Select Dropdown */}
            <select
              className="disname"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All Status">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <table className="user-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total Orders</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="customer-cell">
                      <img
                        src={
                          user.profileImage
                            ? `${BASE_URL}${user.profileImage}`
                            : "https://i.pravatar.cc/40"
                        }
                        alt={user.name}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || "N/A"}</td>
                    <td>{user.orders ? user.orders.length : 0}</td>
                    <td>{user.lastActive || "N/A"}</td>

                    <td
                      style={{ cursor: "pointer", fontWeight: "bold" }}
                      onClick={() =>
                        handleStatusChange(user._id, user.status)
                      }
                    >
                      {user.status}
                    </td>

                    <td className="actions">
                      <span
                        className="fs-4"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === user._id ? null : user._id
                          )
                        }
                      >
                        ⋮
                      </span>
                      {openDropdown === user._id && (
                        <ul
                          className="dropdown-menu dropdown-menu-end"
                          style={{
                            display: "block",
                            position: "absolute",
                            zIndex: 10,
                          }}
                        >
                          <li>
                            <button
                              className="dropdown-item text-primary"
                              onClick={() => {
                                setViewUser(user);
                                setOpenDropdown(null);
                              }}
                            >
                              View
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item text-danger"
                              onClick={() => {
                                handleDelete(user._id);
                                setOpenDropdown(null);
                              }}
                            >
                              Delete
                            </button>
                          </li>
                        </ul>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button onClick={handlePrev} disabled={currentPage === 1}>
              Previous
            </button>
            <span style={{ margin: "0 10px" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button onClick={handleNext} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>

      {viewUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="close-btn" onClick={() => setViewUser(null)}>
              &times;
            </button>
            <h3>User Details</h3>
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              <img
                src={
                  viewUser.profileImage
                    ? `${BASE_URL}${viewUser.profileImage}`
                    : "https://i.pravatar.cc/100"
                }
                alt={viewUser.name}
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                }}
              />
            </div>
            <p><strong>Name:</strong> {viewUser.name}</p>
            <p><strong>Email:</strong> {viewUser.email}</p>
            <p><strong>Phone:</strong> {viewUser.phone || "N/A"}</p>
            <p><strong>Status:</strong> {viewUser.status}</p>
            <p>
              <strong>Member Since:</strong>{" "}
              {viewUser.createdAt
                ? new Date(viewUser.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}