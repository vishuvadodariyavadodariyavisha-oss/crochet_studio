import React, { useState, useEffect } from "react";
import "./AdminCss/adminproduct.css";

const BASE_URL = "http://localhost:5000";

const EMPTY_VARIANT = {
  variantName: "",
  variantType: "size",
  size: "",
  layers: "",
  petalType: "",
  price: "",
  discount: 0,
  stockQuantity: "",
  sku: "",
  isActive: true,
};

const EMPTY_FORM = {
  productName: "",
  categoryId: "",
  basePrice: "",
  discount: 0,
  material: "",
  description: "",
  color: "",
  isCustomizable: false,
  isActive: true,
  hasVariants: true,
};

export default function ProductManagement() {
  const [productList, setProductList]     = useState([]);
  const [categories, setCategories]       = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [imageFiles, setImageFiles]       = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editProduct, setEditProduct]     = useState(null); // null = add, obj = edit
  const [deleteConfirm, setDeleteConfirm] = useState(null); // productId to confirm

  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/product/getAllProducts`);
      const data = await res.json();
      setProductList(data.success && Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      console.error("Product Fetch Error:", e);
      setProductList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/category/categories`);
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : Array.isArray(data.categories) ? data.categories : [];
      setCategories(arr);
    } catch (e) {
      console.error("Category Fetch Error:", e);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getTotalStock = (product) => {
    if (product.hasVariants && Array.isArray(product.variants)) {
      return product.variants.reduce((s, v) => s + (v.stockQuantity || 0), 0);
    }
    return product.stockQuantity ?? "—";
  };

  // ✅ availableQuantity = stockQty - reservedQty
  const getAvailableStock = (product) => {
    if (product.hasVariants && Array.isArray(product.variants)) {
      return product.variants.reduce(
        (s, v) => s + ((v.stockQuantity || 0) - (v.reservedQuantity || 0)),
        0
      );
    }
    return (product.stockQuantity || 0) - (product.reservedQuantity || 0);
  };

  const getDisplayPrice = (product) => {
    if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
      const prices = product.variants.map((v) => v.price);
      const min = Math.min(...prices), max = Math.max(...prices);
      return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
    }
    const base = product.basePrice ?? product.price;
    const disc = product.discount;
    if (base && disc) return `₹${base - (base * disc) / 100}`;
    return base ? `₹${base}` : "—";
  };

  const getCategoryName = (product) => {
    if (product.categoryId && typeof product.categoryId === "object")
      return product.categoryId.categoryName || product.categoryId.name || "—";
    return product.category || "—";
  };

  // ─── Form handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleVariantChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updated = [...variants];
    updated[index] = { ...updated[index], [name]: type === "checkbox" ? checked : value };
    setVariants(updated);
  };

  const addVariant    = () => setVariants([...variants, { ...EMPTY_VARIANT }]);
  const removeVariant = (i) => setVariants(variants.filter((_, idx) => idx !== i));

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setVariants([{ ...EMPTY_VARIANT }]);
    setImageFiles([]);
    setImagePreviews([]);
    setEditProduct(null);
  };

  // ─── Open Edit Modal ──────────────────────────────────────────────────────
  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      productName:    product.productName  || "",
      categoryId:     product.categoryId?._id || product.categoryId || "",
      basePrice:      product.basePrice    || "",
      discount:       product.discount     || 0,
      material:       product.material     || "",
      description:    product.description  || "",
      color:          Array.isArray(product.color) ? product.color.join(", ") : product.color || "",
      isCustomizable: product.isCustomizable || false,
      isActive:       product.isActive !== false,
      hasVariants:    product.hasVariants  || false,
    });
    setVariants(
      product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({
            variantName:   v.variantName   || "",
            variantType:   v.variantType   || "size",
            size:          v.size          || "",
            layers:        v.layers        || "",
            petalType:     v.petalType     || "",
            price:         v.price         || "",
            discount:      v.discount      || 0,
            stockQuantity: v.stockQuantity || "",
            sku:           v.sku           || "",
            isActive:      v.isActive !== false,
            _id:           v._id,
          }))
        : [{ ...EMPTY_VARIANT }]
    );
    setImagePreviews(product.images?.map((img) => `${BASE_URL}/${img}`) || []);
    setImageFiles([]);
    setShowModal(true);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (productId) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/product/deleteProduct/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchProducts();
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("Error deleting product.");
    }
  };

  // ─── Submit (Add / Edit) ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("productName",    formData.productName);
      fd.append("categoryId",     formData.categoryId);
      fd.append("basePrice",      formData.basePrice);
      fd.append("discount",       formData.discount);
      fd.append("material",       formData.material);
      fd.append("description",    formData.description);
      fd.append("isCustomizable", formData.isCustomizable);
      fd.append("isActive",       formData.isActive);
      fd.append("hasVariants",    formData.hasVariants);

      const colorArray = formData.color.split(",").map((c) => c.trim()).filter(Boolean);
      colorArray.forEach((c) => fd.append("color[]", c));

      const cleanVariants = variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        variantName:   v.variantName,
        variantType:   v.variantType,
        size:          v.size      || null,
        layers:        v.layers    || null,
        petalType:     v.petalType || null,
        price:         parseFloat(v.price)         || 0,
        discount:      parseFloat(v.discount)      || 0,
        stockQuantity: parseInt(v.stockQuantity)   || 0,
        sku:           v.sku,
        isActive:      v.isActive,
      }));
      fd.append("variants", JSON.stringify(cleanVariants));

      imageFiles.forEach((file) => fd.append("images", file));

      const isEdit = !!editProduct;
      const url    = isEdit
        ? `${BASE_URL}/api/product/updateProduct/${editProduct._id}`
        : `${BASE_URL}/api/product/add-product`;
      const method = isEdit ? "PUT" : "POST";

      const res  = await fetch(url, { method, body: fd });
      const data = await res.json();

      if (data.success) {
        alert(isEdit ? "Product updated successfully!" : "Product added successfully!");
        setShowModal(false);
        resetForm();
        fetchProducts();
      } else {
        alert(data.message || "Failed to save product");
      }
    } catch (error) {
      console.error("Save Product Error:", error);
      alert("Error saving product. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      <div className="main-content">
        <div className="product-container">

          {/* Header */}
          <div className="product-header">
            <h2>Product Management</h2>
            <button className="add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
              + Add New Product
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ textAlign: "center", padding: "20px" }}>Loading products...</p>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Available</th>
                  <th>Price</th>
                  <th>Customizable</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productList.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center" }}>No products found.</td>
                  </tr>
                ) : (
                  productList.map((item, index) => {
                    const available = getAvailableStock(item);
                    return (
                      <tr key={item._id}>
                        <td>{index + 1}</td>
                        <td>
                          {item.images?.length > 0 ? (
                            <img
                              src={`${BASE_URL}/${item.images[0]}`}
                              alt={item.productName}
                              className="product-img"
                            />
                          ) : (
                            <span style={{ color: "#aaa", fontSize: "12px" }}>No Image</span>
                          )}
                        </td>
                        <td>{item.productName}</td>
                        <td>{getCategoryName(item)}</td>
                        <td>{getTotalStock(item)}</td>

                        {/* ✅ Available Quantity column */}
                        <td>
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: available <= 0 ? "#ffebee" : available <= 5 ? "#fff3e0" : "#e8f5e9",
                            color:      available <= 0 ? "#c62828" : available <= 5 ? "#e65100" : "#2e7d32",
                          }}>
                            {available <= 0 ? "Out of Stock" : available}
                          </span>
                        </td>

                        <td>{getDisplayPrice(item)}</td>

                        {/* ✅ Customizable — fixed */}
                        <td>
                          <span className={`status ${item.isCustomizable ? "active" : "draft"}`}>
                            {item.isCustomizable ? "Yes" : "No"}
                          </span>
                        </td>

                        <td>
                          <span className={`status ${item.isActive ? "active" : "draft"}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* ✅ Actions — Edit + Delete */}
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="action-btn AP-edit-btn"
                              onClick={() => openEdit(item)}
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => setDeleteConfirm(item._id)}
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog" style={{ maxWidth: "400px", marginTop: "20vh" }}>
            <div className="modal-content" style={{ borderRadius: "14px" }}>
              <div className="modal-header">
                <h5 className="modal-title" style={{ color: "#c62828" }}>⚠️ Delete Product</h5>
              </div>
              <div className="modal-body">
                <p style={{ color: "#3e2f25", margin: 0 }}>
                  Are you sure you want to delete this product? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  className="btn"
                  style={{ background: "#c62828", color: "white", border: "none" }}
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-content">

              <div className="modal-header">
                <h5 className="modal-title">{editProduct ? "✏️ Edit Product" : "Add New Product"}</h5>
                <button className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">

                  {/* Product Name */}
                  <div className="mb-3">
                    <label className="form-label">Product Name *</label>
                    <input type="text" name="productName" className="form-control"
                      value={formData.productName} onChange={handleChange} required />
                  </div>

                  {/* Category */}
                  <div className="mb-3">
                    <label className="form-label">Category *</label>
                    <select name="categoryId" className="form-select"
                      value={formData.categoryId} onChange={handleChange} required>
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.categoryName || cat.name || cat.title || "Unnamed"}
                        </option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <small className="text-danger">No categories loaded. Check API.</small>
                    )}
                  </div>

                  {/* Base Price & Discount */}
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Base Price (₹) *</label>
                      <input type="number" name="basePrice" className="form-control"
                        value={formData.basePrice} onChange={handleChange} required min="0" />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Discount %</label>
                      <input type="number" name="discount" className="form-control"
                        value={formData.discount} onChange={handleChange} min="0" max="100" />
                    </div>
                  </div>

                  {/* Material */}
                  <div className="mb-3">
                    <label className="form-label">Material</label>
                    <input type="text" name="material" className="form-control"
                      value={formData.material} onChange={handleChange} placeholder="e.g. Cotton Yarn" />
                  </div>

                  {/* Colors */}
                  <div className="mb-3">
                    <label className="form-label">Colors (comma separated)</label>
                    <input type="text" name="color" className="form-control"
                      value={formData.color} onChange={handleChange} placeholder="e.g. red, pink, white" />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea name="description" className="form-control" rows="3"
                      value={formData.description} onChange={handleChange}></textarea>
                  </div>

                  {/* Images */}
                  <div className="mb-3">
                    <label className="form-label">Product Images {editProduct && <small className="text-muted">(leave empty to keep existing)</small>}</label>
                    <input type="file" className="form-control" multiple accept="image/*" onChange={handleImageChange} />
                    {imagePreviews.length > 0 && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        {imagePreviews.map((src, i) => (
                          <img key={i} src={src} alt={`preview-${i}`}
                            style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Checkboxes */}
                  <div className="row mb-3">
                    {/* ✅ Customizable — proper checkbox */}
                    <div className="col-md-4">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="isCustomizable"
                          name="isCustomizable" checked={!!formData.isCustomizable} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="isCustomizable">Customizable</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="hasVariants"
                          name="hasVariants" checked={!!formData.hasVariants} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="hasVariants">Has Variants</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="isActive"
                          name="isActive" checked={!!formData.isActive} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="isActive">Active</label>
                      </div>
                    </div>
                  </div>

                  {/* ─── Variants Section ───────────────────────────────── */}
                  {formData.hasVariants && (
                    <div style={{ border: "1px solid #dee2e6", borderRadius: "8px", padding: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h6 style={{ margin: 0 }}>Variants</h6>
                        {/* ✅ Add Variant button */}
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={addVariant}>
                          + Add Variant
                        </button>
                      </div>

                      {variants.map((variant, index) => (
                        <div key={index} style={{
                          background: "#f8f9fa", borderRadius: "6px", padding: "12px",
                          marginBottom: "12px", position: "relative"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "13px" }}>Variant {index + 1}</strong>
                            {variants.length > 1 && (
                              <button type="button" className="btn btn-sm btn-outline-danger"
                                onClick={() => removeVariant(index)}
                                style={{ padding: "2px 8px", fontSize: "12px" }}>
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="row">
                            <div className="col-md-6 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Variant Name *</label>
                              <input type="text" name="variantName" className="form-control form-control-sm"
                                value={variant.variantName} onChange={(e) => handleVariantChange(index, e)}
                                placeholder="e.g. Flower, Blanket" required={formData.hasVariants} />
                            </div>
                            <div className="col-md-6 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Variant Type</label>
                              <select name="variantType" className="form-select form-select-sm"
                                value={variant.variantType} onChange={(e) => handleVariantChange(index, e)}>
                                <option value="size">Size</option>
                                <option value="color">Color</option>
                                <option value="layers">Layers</option>
                                <option value="petalType">Petal Type</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>

                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Size</label>
                              <select name="size" className="form-select form-select-sm"
                                value={variant.size} onChange={(e) => handleVariantChange(index, e)}>
                                <option value="">None</option>
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                                <option value="extra-large">Extra Large</option>
                              </select>
                            </div>

                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Layers</label>
                              <select name="layers" className="form-select form-select-sm"
                                value={variant.layers} onChange={(e) => handleVariantChange(index, e)}>
                                <option value="">None</option>
                                <option value="1-layer">1 Layer</option>
                                <option value="2-layer">2 Layer</option>
                                <option value="3-layer">3 Layer</option>
                                <option value="20">20</option>
                              </select>
                            </div>

                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Petal Type</label>
                              <select name="petalType" className="form-select form-select-sm"
                                value={variant.petalType} onChange={(e) => handleVariantChange(index, e)}>
                                <option value="">None</option>
                                <option value="open">Open</option>
                                <option value="close">Close</option>
                                <option value="long">Long</option>
                                <option value="medium">Medium</option>
                                <option value="open-close">Open-Close</option>
                              </select>
                            </div>

                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Price (₹) *</label>
                              <input type="number" name="price" className="form-control form-control-sm"
                                value={variant.price} onChange={(e) => handleVariantChange(index, e)}
                                required={formData.hasVariants} min="0" />
                            </div>
                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Discount %</label>
                              <input type="number" name="discount" className="form-control form-control-sm"
                                value={variant.discount} onChange={(e) => handleVariantChange(index, e)}
                                min="0" max="100" />
                            </div>
                            <div className="col-md-4 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>Stock Qty *</label>
                              <input type="number" name="stockQuantity" className="form-control form-control-sm"
                                value={variant.stockQuantity} onChange={(e) => handleVariantChange(index, e)}
                                required={formData.hasVariants} min="0" />
                            </div>

                            <div className="col-md-8 mb-2">
                              <label className="form-label" style={{ fontSize: "12px" }}>SKU</label>
                              <input type="text" name="sku" className="form-control form-control-sm"
                                value={variant.sku} onChange={(e) => handleVariantChange(index, e)}
                                placeholder="e.g. flower-SML-001" />
                            </div>
                            <div className="col-md-4 mb-2" style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                              <div className="form-check">
                                <input type="checkbox" className="form-check-input" name="isActive"
                                  id={`variantActive-${index}`} checked={variant.isActive}
                                  onChange={(e) => handleVariantChange(index, e)} />
                                <label className="form-check-label" htmlFor={`variantActive-${index}`}
                                  style={{ fontSize: "12px" }}>Active</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowModal(false); resetForm(); }} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={submitting}>
                    {submitting ? "Saving..." : editProduct ? "Update Product" : "Save Product"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}