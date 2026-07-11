const mongoose = require("mongoose");
// controllers/bulkOrderController.js
const BulkOrder = require('../modules/bulkOrderSchema');
const Product   = require('../modules/productSchema');

// ── Helper: calculate bulk discount ──────────────────────────────────────────
const getBulkDiscount = (subtotal) => {
  if (subtotal >= 50000) return 7;
  if (subtotal >= 30000) return 5;
  if (subtotal >= 15000) return 3;
  return 0;
};

const getDiscountedPrice = (price, discount) => {
  if (!price) return 0;
  return Math.round(price - (price * (discount || 0)) / 100);
};

// ════════════════════════════════════════════════════════════════════════════
// POST /api/bulkorders/create
// Creates a bulk order (quote OR direct with manual payment)
// ════════════════════════════════════════════════════════════════════════════
const createBulkOrder = async (req, res) => {
  try {
    const {
      userId, productId, quantity,
      customText, selectedSize, instructions, eventType, deliveryDate,
      yarnColors, primaryColor, secondaryColor, colorNotes,
      orderType,        // 'direct' | 'quote'
      paymentMethod,    // 'cod' | 'bank_transfer' | 'upi' | 'cash'
      upiId,            // if paymentMethod === 'upi'
      variantId,
    } = req.body;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({ success: false, message: 'userId, productId and quantity are required.' });
    }
    if (Number(quantity) < 10) {
      return res.status(400).json({ success: false, message: 'Minimum quantity for bulk order is 10.' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // ── Price calculation ────────────────────────────────────
    let unitPrice    = product.basePrice;
    let unitDiscount = product.discount || 0;

    if (variantId) {
      const variant = (product.variants || []).find(v => v._id.toString() === variantId && v.isActive);
      if (variant) { unitPrice = variant.price; unitDiscount = variant.discount || 0; }
    }

    const discountedUnit  = getDiscountedPrice(unitPrice, unitDiscount);
    const subtotal        = discountedUnit * Number(quantity);
    const discountPercent = getBulkDiscount(subtotal);
    const discountAmount  = Math.round(subtotal * discountPercent / 100);
    const finalAmount     = subtotal - discountAmount;

    // ── Design preference ────────────────────────────────────
    let designPreference = '';
    if (selectedSize && instructions)  designPreference = `Size: ${selectedSize} | Instructions: ${instructions}`;
    else if (selectedSize)             designPreference = `Size: ${selectedSize}`;
    else if (instructions)             designPreference = instructions;

    const isDirectOrder = orderType === 'direct';

    const bulkOrder = new BulkOrder({
      userId,
      productId,
      productType:     product.productName || product.name || 'Unknown Product',
      quantity:        Number(quantity),
      designPreference,
      eventType:       eventType      || '',
      deliveryDate:    deliveryDate   || null,
      customMessage:   customText     || '',
      yarnColors:      Array.isArray(yarnColors) ? yarnColors : [],
      primaryColor:    primaryColor   || '',
      secondaryColor:  secondaryColor || '',
      colorNotes:      colorNotes     || '',
      orderType:       isDirectOrder ? 'direct' : 'quote',
      unitPrice:       discountedUnit,
      subtotal,
      discountPercent,
      discountAmount,
      finalAmount,
      // Payment info (only for direct orders)
      ...(isDirectOrder && {
        paymentMethod:  paymentMethod || 'cod',
        paymentStatus:  'pending',          // Admin will confirm after verifying
        ...(upiId && { upiId }),
      }),
      status: 'requested',                  // Always starts as requested
    });

    await bulkOrder.save();

    return res.status(201).json({
      success: true,
      message: isDirectOrder
        ? "Order placed! Admin will confirm after verifying your payment."
        : "Quote request submitted! We'll contact you soon.",
      bulkOrder,
    });
  } catch (err) {
    console.error('createBulkOrder error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bulkorders/all  (Admin)
// ════════════════════════════════════════════════════════════════════════════
const getAllBulkOrders = async (req, res) => {
  try {
    const { status, paymentStatus, orderType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)        filter.status        = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderType)     filter.orderType     = orderType;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      BulkOrder.find(filter)
        .populate('userId', 'name email phone')
        .populate('productId', 'productName images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      BulkOrder.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true, total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: orders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bulkorders/user/:userId  (User's own orders)
// ════════════════════════════════════════════════════════════════════════════
const getMyBulkOrders = async (req, res) => {
  try {
    const orders = await BulkOrder.find({ userId: req.params.userId })
      .populate('productId', 'productName images')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/bulkorders/status/:id  (Admin updates status)
// ════════════════════════════════════════════════════════════════════════════
const updateBulkOrderStatus = async (req, res) => {
  try {
    const { status, quotedPrice, adminNote, paymentStatus } = req.body;

    const validStatuses = ['requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const update = {};
    if (status)        update.status        = status;
    if (quotedPrice !== undefined) update.quotedPrice = quotedPrice;
    if (adminNote)     update.adminNote     = adminNote;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    // Auto-set paidAt when admin marks payment as paid
    if (paymentStatus === 'paid') update.paidAt = new Date();

    const order = await BulkOrder.findByIdAndUpdate(
      req.params.id, update, { new: true }
    ).populate('userId', 'name email');

    if (!order) return res.status(404).json({ success: false, message: 'Bulk order not found.' });

    return res.status(200).json({
      success: true,
      message: `Order updated successfully.`,
      data: order,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/bulkorders/:id  (Admin)
// ════════════════════════════════════════════════════════════════════════════
const deleteBulkOrder = async (req, res) => {
  try {
    const order = await BulkOrder.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Bulk order not found.' });
    return res.status(200).json({ success: true, message: 'Bulk order deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updateBulkOrderQuote = async (req, res) => {
  try {
    const { quotedPrice } = req.body;
    const order = await BulkOrder.findByIdAndUpdate(
      req.params.id,
      { quotedPrice: Number(quotedPrice) },
      { new: true }
    ).populate('userId', 'name email')
     .populate('productId', 'productName');

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, bulkOrder: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET SINGLE BULK ORDER
// const getBulkOrderById = async (req, res) => {
//   try {
//     const order = await BulkOrder.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Bulk order not found",
//       });
//     }

//     res.json({
//       success: true,
//       data: order,
//     });

//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// GET /api/bulkorders/getBulkOrderById/:id
const getBulkOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID.",
      });
    }

    const order = await BulkOrder.findById(id)
      .populate("userId",    "name email phone")
      .populate("productId", "productName images basePrice");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Bulk order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error("getBulkOrderById error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

module.exports = {
  createBulkOrder,
  getAllBulkOrders,
  getMyBulkOrders,
  updateBulkOrderStatus,
  deleteBulkOrder,
  updateBulkOrderQuote,
  getBulkOrderById
};