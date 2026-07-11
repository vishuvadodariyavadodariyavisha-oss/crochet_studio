import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminCss/admincategory.css";

const BASE_URL = "http://localhost:5000/api/category/";

const AdminCategory = () => {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    image: null,
    status: "active",
  });

  // ================= FETCH =================
  const fetchCategories = async () => {
    const res = await axios.get(`${BASE_URL}categories`);
    setCategories(res.data.data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ================= INPUT =================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImage = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const openAddModal = () => {
    setIsEdit(false);
    setFormData({
      id: null,
      name: "",
      description: "",
      image: null,
      status: "active",
    });
    setShowModal(true);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("categoryName", formData.name);  // 🔥 FIXED
    data.append("description", formData.description);
    data.append("status", formData.status);

    if (formData.image) {
      data.append("image", formData.image);
    }

    try {
      if (isEdit) {
        await axios.put(
          `${BASE_URL}categories/${formData.id}`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        await axios.post(
          `${BASE_URL}add-categories`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      fetchCategories();
      setShowModal(false);

    } catch (error) {
      console.error(error.response?.data || error.message);
    }
  };

  // ================= EDIT =================
  const handleEdit = (cat) => {
    setIsEdit(true);
    setFormData({
      id: cat._id,
      name: cat.categoryName,
      description: cat.description,
      image: null,
      status: cat.status,
    });
    setShowModal(true);
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (window.confirm("Delete this category?")) {
      await axios.delete(`${BASE_URL}categories/${id}`);
      fetchCategories();
    }
  };

  return (
    <div className="admin-category-page">
      <div className="container-fluid mt-5 p-4 category-container">

        <div className="d-flex justify-content-between mb-4">
          <h2 className="page-title">Category Management</h2>
          <button className="btn add-btn" onClick={openAddModal}>
            + Add Category
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover category-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id}>
                  <td>
                    {cat.image ? (
                      <img
                        src={`http://localhost:5000/${cat.image}`}
                        alt=""
                        className="cat-img"
                      />
                    ) : "No Image"}
                  </td>
                  <td>{cat.categoryName}</td>
                  <td>{cat.description}</td>
                  <td>{cat.status}</td>
                  <td>
                    <button
                      className="btn btn-sm ca-edit-btn me-2"
                      onClick={() => handleEdit(cat)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(cat._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="custom-modal">
          <div className="modal-content-box">
            <h5>{isEdit ? "Edit Category" : "Add Category"}</h5>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                className="form-control mb-3"
                placeholder="Category Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <textarea
                className="form-control mb-3"
                placeholder="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />

              <input
                type="file"
                className="form-control mb-3"
                onChange={handleImage}
              />

              <select
                className="form-select mb-3"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>

              <button type="submit" className="btn save-btn w-100">
                {isEdit ? "Update Category" : "Save Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategory;