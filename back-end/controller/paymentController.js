const mongoose = require("mongoose");

const Payment       = require("../modules/paymentSchema");
const Order         = require("../modules/orderSchema");
const BulkOrder     = require("../modules/bulkOrderSchema");
const Customization = require("../modules/customizedOrderSchema");
const Product       = require("../modules/productSchema");

// ─── Helper: generate unique transaction ID ───────────────────────────────────
const generateTransactionId = () => {
  const ts     = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${ts}-${random}`;
};

// ─── Helper: deduct stock for regular Orders (already paid) ──────────────────
const deductStockForItems = async (orderItems = []) => {
  if (!orderItems || orderItems.length === 0) return;

  for (const item of orderItems) {
    try {
      const productId = item.productId?._id ?? item.productId;
      const variantId = item.variantId ?? null;
      const quantity  = item.quantity  ?? 1;

      if (!productId) continue;

      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️  Product not found: ${productId}`);
        continue;
      }

      if (product.hasVariants && variantId) {
        const variant = product.variants.id(variantId);
        if (!variant) {
          console.warn(`⚠️  Variant not found: ${variantId}`);
          continue;
        }
        if (variant.stockQuantity >= quantity) {
          variant.stockQuantity -= quantity;
          variant.soldQuantity   = (variant.soldQuantity || 0) + quantity;
          await product.save();
          console.log(`✅ Variant stock deducted — ${product.productName} | Remaining: ${variant.stockQuantity}`);
        } else {
          console.warn(`⚠️  Insufficient variant stock for ${product.productName}`);
        }
      } else {
        product.stockQuantity = product.stockQuantity || 0;
        if (product.stockQuantity >= quantity) {
          product.stockQuantity -= quantity;
          product.soldQuantity   = (product.soldQuantity || 0) + quantity;
          await product.save();
          console.log(`✅ Stock deducted — ${product.productName} | Remaining: ${product.stockQuantity}`);
        } else {
          console.warn(`⚠️  Insufficient stock for ${product.productName}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️  Stock deduction error (non-blocking): ${err.message}`);
    }
  }
};

// ─── Helper: deduct stock for a single BulkOrder after payment ───────────────
// BulkOrder has a single productId + variantId + quantity (not an array)
const deductStockForBulkOrder = async (bulkOrder) => {
  try {
    const productId = bulkOrder.productId?._id ?? bulkOrder.productId;
    const variantId = bulkOrder.variantId ?? null;
    const quantity  = bulkOrder.quantity  ?? 1;

    if (!productId) {
      console.warn("⚠️  BulkOrder has no productId — skipping stock deduction");
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.warn(`⚠️  Product not found for bulk order stock deduction: ${productId}`);
      return;
    }

    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        console.warn(`⚠️  Variant not found: ${variantId}`);
        return;
      }
      if (variant.stockQuantity >= quantity) {
        variant.stockQuantity -= quantity;
        variant.soldQuantity   = (variant.soldQuantity || 0) + quantity;
        await product.save();
        console.log(`✅ Bulk order variant stock deducted — ${product.productName} | qty: ${quantity} | remaining: ${variant.stockQuantity}`);
      } else {
        console.warn(`⚠️  Insufficient variant stock for bulk order: ${product.productName} (has: ${variant.stockQuantity}, needs: ${quantity})`);
      }
    } else {
      product.stockQuantity = product.stockQuantity || 0;
      if (product.stockQuantity >= quantity) {
        product.stockQuantity -= quantity;
        product.soldQuantity   = (product.soldQuantity || 0) + quantity;
        await product.save();
        console.log(`✅ Bulk order stock deducted — ${product.productName} | qty: ${quantity} | remaining: ${product.stockQuantity}`);
      } else {
        console.warn(`⚠️  Insufficient stock for bulk order: ${product.productName} (has: ${product.stockQuantity}, needs: ${quantity})`);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Bulk order stock deduction error (non-blocking): ${err.message}`);
  }
};

// ─── Helper: update order status after payment ────────────────────────────────
const updateOrderPaymentStatus = async (orderId, orderModel, paymentType, amount, transactionId) => {
  try {
    if (orderModel === "BulkOrder") {
      await BulkOrder.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        paidAmount:    amount,
        transactionId: transactionId ?? "",
        status:        "processing",
      });
    } else if (orderModel === "Customization") {
      await Customization.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        paidAmount:    amount,
        transactionId: transactionId ?? "",
      });
    } else {
      const updateData = {
        paymentStatus: "paid",
        paidAmount:    amount,
        transactionId: transactionId ?? "",
      };
      if (paymentType === "full") updateData.orderStatus = "processing";
      await Order.findByIdAndUpdate(orderId, updateData);
    }
    console.log(`✅ Order payment status updated — ${orderModel}: ${orderId}`);
  } catch (err) {
    console.warn(`⚠️  Order status update error (non-blocking): ${err.message}`);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CREATE PAYMENT  —  POST /api/payment/create
// ══════════════════════════════════════════════════════════════════════════════
exports.createPayment = async (req, res) => {
  try {
    const {
      orderId,
      orderModel    = "Order",
      paymentType   = "full",
      paymentMethod,
      amount,
      userId,
      upiId,
      upiApp,
      bank,
      cardLast4,
      cardName,
    } = req.body;

    // ── Validations ───────────────────────────────────────────────────────────
    if (!orderId)
      return res.status(400).json({ success: false, message: "orderId is required." });

    if (!mongoose.Types.ObjectId.isValid(orderId))
      return res.status(400).json({ success: false, message: `Invalid orderId: "${orderId}"` });

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Valid amount is required." });

    if (!userId)
      return res.status(400).json({ success: false, message: "userId is required." });

    if (!paymentMethod)
      return res.status(400).json({ success: false, message: "paymentMethod is required." });

    const validMethods = ["upi", "card", "netbank", "cod"];
    if (!validMethods.includes(paymentMethod))
      return res.status(400).json({
        success: false,
        message: `Invalid paymentMethod. Allowed: ${validMethods.join(", ")}`,
      });

    const validModels = ["Order", "BulkOrder", "Customization"];
    if (!validModels.includes(orderModel))
      return res.status(400).json({
        success: false,
        message: `Invalid orderModel. Allowed: ${validModels.join(", ")}`,
      });

    // ── Duplicate payment check ───────────────────────────────────────────────
    const existing = await Payment.findOne({
      orderId, orderModel, paymentStatus: "success", paymentType,
    });
    if (existing)
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this order.",
        data:    existing,
      });

    // ── For BulkOrder: verify it is approved before accepting payment ─────────
    if (orderModel === "BulkOrder") {
      const bulkOrder = await BulkOrder.findById(orderId);
      if (!bulkOrder)
        return res.status(404).json({ success: false, message: "Bulk order not found." });

      if (bulkOrder.status !== "approved")
        return res.status(400).json({
          success: false,
          message: `Payment not allowed. Bulk order status is "${bulkOrder.status}". Must be "approved".`,
        });
    }

    // ── Generate transaction ID ───────────────────────────────────────────────
    const transactionId = generateTransactionId();

    // ── Build payment document ────────────────────────────────────────────────
    const paymentData = {
      orderId:       new mongoose.Types.ObjectId(orderId),
      orderModel,
      userId:        new mongoose.Types.ObjectId(userId),
      amount:        Number(amount),
      paymentMethod,
      paymentType,
      paymentStatus: "success",
      transactionId,
    };

    if (paymentMethod === "upi") {
      if (upiId)  paymentData.upiId  = upiId;
      if (upiApp) paymentData.upiApp = upiApp;
    }
    if (paymentMethod === "netbank" && bank)  paymentData.bank = bank;
    if (paymentMethod === "card") {
      if (cardLast4) paymentData.cardLast4 = cardLast4;
      if (cardName)  paymentData.cardName  = cardName;
    }

    // ── Save payment ──────────────────────────────────────────────────────────
    const payment = await Payment.create(paymentData);
    console.log(`✅ Payment saved — ID: ${payment._id} | TxnID: ${payment.transactionId}`);

    // ── Update order status ───────────────────────────────────────────────────
    await updateOrderPaymentStatus(orderId, orderModel, paymentType, Number(amount), transactionId);

    // ── Stock deduction (correct place — after successful payment) ────────────
    if (orderModel === "Order") {
      // Regular shop order: deduct from orderItems array
      try {
        const order = await Order.findById(orderId);
        if (order?.orderItems?.length > 0) {
          await deductStockForItems(order.orderItems);
        }
      } catch (stockErr) {
        console.warn("⚠️  Regular order stock deduction failed (non-blocking):", stockErr.message);
      }

    } else if (orderModel === "BulkOrder") {
      // Bulk order: deduct single product after admin-approved payment
      try {
        const bulkOrder = await BulkOrder.findById(orderId);
        if (bulkOrder) {
          await deductStockForBulkOrder(bulkOrder);
        }
      } catch (stockErr) {
        console.warn("⚠️  Bulk order stock deduction failed (non-blocking):", stockErr.message);
      }
    }
    // Customization orders: no stock to deduct (custom made)

    return res.status(201).json({
      success: true,
      message: "Payment successful!",
      data:    payment,
    });

  } catch (error) {
    console.error("❌ createPayment error:", error);

    if (error.code === 11000)
      return res.status(400).json({
        success: false,
        message: "Duplicate transaction. Please try again.",
      });

    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing payment.",
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET ALL PAYMENTS  —  GET /api/payment/all  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean();

    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    console.error("❌ getAllPayments error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET PAYMENTS BY USER  —  GET /api/payment/user/:userId
// ══════════════════════════════════════════════════════════════════════════════
exports.getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: "Invalid userId." });

    const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    console.error("❌ getPaymentsByUser error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET PAYMENT BY ID  —  GET /api/payment/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid payment ID." });

    const payment = await Payment.findById(id).populate("userId", "name email").lean();

    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found." });

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error("❌ getPaymentById error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE PAYMENT STATUS  —  PUT /api/payment/status/:id  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id }            = req.params;
    const { paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid payment ID." });

    const validStatuses = ["pending", "success", "failed"];
    if (!validStatuses.includes(paymentStatus))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(", ")}`,
      });

    const payment = await Payment.findByIdAndUpdate(id, { paymentStatus }, { new: true });

    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found." });

    return res.status(200).json({ success: true, message: "Payment status updated.", data: payment });
  } catch (error) {
    console.error("❌ updatePaymentStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DELETE PAYMENT  —  DELETE /api/payment/:id  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid payment ID." });

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment)
      return res.status(404).json({ success: false, message: "Payment not found." });

    return res.status(200).json({ success: true, message: "Payment deleted." });
  } catch (error) {
    console.error("❌ deletePayment error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};