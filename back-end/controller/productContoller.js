const Product = require("../modules/productSchema");
const mongoose = require("mongoose");

/* =====================================================
   CREATE PRODUCT
===================================================== */
const createProduct = async (req, res) => {
  try {

    const body = req.body || {};

    let {
      categoryId,
      productName,
      description,
      basePrice,
      discount,
      variants,
      hasVariants,
      material,
      color,
      isCustomizable
    } = body;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Valid categoryId is required" });
    }

    if (!productName || !basePrice) {
      return res.status(400).json({ message: "Product name and base price are required" });
    }

    if (typeof variants === "string") {
      variants = JSON.parse(variants);
    }

    if (typeof color === "string") {
      color = JSON.parse(color);
    }

    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => file.path);
    }

    const product = new Product({
      categoryId,
      productName,
      description,
      basePrice:      Number(basePrice),
      discount:       Number(discount) || 0,
      images:         imagePaths,
      variants:       variants || [],
      hasVariants:    hasVariants === "true" || hasVariants === true,
      stockQuantity:  0,
      material:       material || "Cotton Yarn",
      color:          color || [],
      isCustomizable: isCustomizable === "true" || isCustomizable === true,
      isActive:       true
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate SKU detected",
        error: error.keyValue
      });
    }
    console.error("Create Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/* ==========================================
   GET ALL PRODUCTS
========================================== */
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("categoryId", "categoryName image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalProducts: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ==========================================
   GET PRODUCTS BY CATEGORY
========================================== */
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid Category ID" });
    }

    const products = await Product.find({
      categoryId: new mongoose.Types.ObjectId(categoryId)
    })
      .populate("categoryId", "categoryName image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalProducts: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/* ==========================================
   GET PRODUCT BY ID
========================================== */
const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate("categoryId", "categoryName image");
      
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/* =====================================================
   GET INVENTORY STATS  —  GET /api/product/getInventoryStats
   
   Logic:
   - remaining  = variants.stockQuantity (DB ma live value, orders deduct thai gaya pachhi)
   - ordersUsed = paid orders ma eetla order thai (display only)
   - totalAdded = remaining + ordersUsed (back-calculate)
===================================================== */
const getInventoryStats = async (req, res) => {
  try {
    const Order = require("../modules/orderSchema");

    const products = await Product.find()
      .populate("categoryId", "categoryName")
      .lean();

    // ✅ Paid orders only — stock in hiz orders mathi already deduct thai gayo che
    const orders = await Order.find({
      paymentStatus: "paid",
      isDeleted:     false,
    }).lean();

    // Map: "productId_variantId" → total qty ordered (paid orders)
    const orderedMap = {};
    orders.forEach((order) => {
      (order.orderItems || []).forEach((item) => {
        const key = `${item.productId}_${item.variantId || "base"}`;
        orderedMap[key] = (orderedMap[key] || 0) + (item.quantity || 0);
      });
    });

    const rows = [];

    products.forEach((prod) => {
      const variants = (prod.variants || []).filter((v) => v.isActive !== false);

      if (variants.length === 0) {
        // Non-variant product
        const key        = `${prod._id}_base`;
        const ordersUsed = orderedMap[key] || 0;
        const remaining  = prod.stockQuantity || 0;
        const totalAdded = remaining + ordersUsed;

        rows.push({
          productId:   prod._id,
          variantId:   null,
          productName: prod.productName,
          category:    prod.categoryId?.categoryName || "—",
          sku:         prod.sku || "—",
          label:       "No Variant",
          price:       prod.basePrice,
          images:      prod.images || [],
          totalAdded,
          ordersUsed,
          remaining,
        });

      } else {
        variants.forEach((v) => {
          const key        = `${prod._id}_${v._id}`;
          const ordersUsed = orderedMap[key] || 0;
          const remaining  = v.stockQuantity || 0;
          const totalAdded = remaining + ordersUsed;

          const label = [
            v.size      || null,
            v.layers    ? `${v.layers} layers` : null,
            v.petalType || null,
            v.variantName || null,
          ].filter(Boolean).join(" • ");

          rows.push({
            productId:   prod._id,
            variantId:   v._id,
            productName: prod.productName,
            category:    prod.categoryId?.categoryName || "—",
            sku:         v.sku || "—",
            label:       label || "Default",
            price:       v.price,
            images:      prod.images || [],
            totalAdded,
            ordersUsed,
            remaining,
          });
        });
      }
    });

    res.json({ success: true, rows });

  } catch (error) {
    console.error("getInventoryStats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   UPDATE VARIANT STOCK  —  PUT /api/product/updateVariantStock
   Admin manually sets stockQuantity (total added qty)
===================================================== */
const updateVariantStock = async (req, res) => {
  try {
    const { productId, variantId, stockQuantity } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Valid productId is required." });
    }
    if (stockQuantity === undefined || stockQuantity === null || isNaN(Number(stockQuantity))) {
      return res.status(400).json({ success: false, message: "Valid stockQuantity is required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({ success: false, message: "Variant not found." });
      }
      variant.stockQuantity = Number(stockQuantity);
    } else {
      product.stockQuantity = Number(stockQuantity);
    }

    await product.save();
    res.json({ success: true, message: "Stock updated successfully." });

  } catch (error) {
    console.error("updateVariantStock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   UPDATE PRODUCT  —  PUT /api/product/updateProduct/:id
===================================================== */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID." });
    }

    const body = req.body || {};

    let { categoryId, productName, description, basePrice, discount,
          variants, hasVariants, material, color, isCustomizable, isActive } = body;

    if (typeof variants === "string") variants = JSON.parse(variants);
    if (typeof color    === "string") {
      try { color = JSON.parse(color); }
      catch { color = color.split(",").map((c) => c.trim()).filter(Boolean); }
    }

    // New images upload thaya hoy to use karo, nahi to existing rakho
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    let imagePaths = product.images; // existing images by default
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((file) => file.path); // new images replace karo
    }

    // Fields update karo
    product.categoryId     = categoryId     || product.categoryId;
    product.productName    = productName    || product.productName;
    product.description    = description    ?? product.description;
    product.basePrice      = Number(basePrice)  || product.basePrice;
    product.discount       = Number(discount)   ?? product.discount;
    product.images         = imagePaths;
    product.material       = material       || product.material;
    product.color          = color          || product.color;
    product.isCustomizable = isCustomizable === "true" || isCustomizable === true;
    product.isActive       = isActive       === "true" || isActive       === true;
    product.hasVariants    = hasVariants    === "true" || hasVariants    === true;

    // Variants update
    if (Array.isArray(variants)) {
      product.variants = variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        variantName:   v.variantName,
        variantType:   v.variantType   || "size",
        size:          v.size          || null,
        layers:        v.layers        || null,
        petalType:     v.petalType     || null,
        price:         parseFloat(v.price)       || 0,
        discount:      parseFloat(v.discount)    || 0,
        stockQuantity: parseInt(v.stockQuantity) || 0,
        sku:           v.sku           || undefined,
        isActive:      v.isActive !== false,
      }));
    }

    await product.save();

    res.status(200).json({ success: true, message: "Product updated successfully.", product });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate SKU detected.", error: error.keyValue });
    }
    console.error("Update Product Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* =====================================================
   DELETE PRODUCT  —  DELETE /api/product/deleteProduct/:id
===================================================== */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID." });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    res.status(200).json({ success: true, message: "Product deleted successfully." });

  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductsByCategory,
  getProductById,
  getInventoryStats,   
  updateVariantStock,
  updateProduct,   
  deleteProduct  
};