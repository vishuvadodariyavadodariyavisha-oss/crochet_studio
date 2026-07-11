const mongoose = require("mongoose");
const Order     = require("../modules/orderSchema");
const Product   = require("../modules/productSchema");

// ══════════════════════════════════════════════════════════════════════════════
// STOCK HELPER  —  reserve / sell / release
// ══════════════════════════════════════════════════════════════════════════════
/**
 * operation:
 *   "reserve"  → order placed   : stockQty ↓  reservedQty ↑
 *   "sell"     → order delivered: reservedQty ↓  soldQty ↑
 *   "release"  → order cancelled: stockQty ↑  reservedQty ↓
 */
async function updateStock(orderItems, operation) {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    if (item.variantId) {
      // ── Variant-level ──────────────────────────────────────────────────────
      const variant = product.variants.id(item.variantId);
      if (!variant) continue;

      if (operation === "reserve") {
        variant.stockQuantity    -= item.quantity;
        variant.reservedQuantity  = (variant.reservedQuantity || 0) + item.quantity;
      } else if (operation === "sell") {
        variant.reservedQuantity  = Math.max(0, (variant.reservedQuantity || 0) - item.quantity);
        variant.soldQuantity      = (variant.soldQuantity || 0) + item.quantity;
      } else if (operation === "release") {
        variant.stockQuantity    += item.quantity;
        variant.reservedQuantity  = Math.max(0, (variant.reservedQuantity || 0) - item.quantity);
      }
    } else {
      // ── Product-level ──────────────────────────────────────────────────────
      if (operation === "reserve") {
        product.stockQuantity    -= item.quantity;
        product.reservedQuantity  = (product.reservedQuantity || 0) + item.quantity;
      } else if (operation === "sell") {
        product.reservedQuantity  = Math.max(0, (product.reservedQuantity || 0) - item.quantity);
        product.soldQuantity      = (product.soldQuantity || 0) + item.quantity;
      } else if (operation === "release") {
        product.stockQuantity    += item.quantity;
        product.reservedQuantity  = Math.max(0, (product.reservedQuantity || 0) - item.quantity);
      }
    }

    await product.save();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STOCK VALIDATION  —  order place karta pehla check karo
// ══════════════════════════════════════════════════════════════════════════════
async function validateStock(orderItems) {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return { ok: false, message: `Product not found: ${item.productId}` };
    }

    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (!variant) {
        return { ok: false, message: `Variant not found: ${item.variantId}` };
      }
      const available = variant.stockQuantity - (variant.reservedQuantity || 0);
      if (available < item.quantity) {
        return {
          ok: false,
          message: `Insufficient stock for "${product.productName}" (variant). Available: ${available}, Requested: ${item.quantity}`,
        };
      }
    } else {
      const available = (product.stockQuantity || 0) - (product.reservedQuantity || 0);
      if (available < item.quantity) {
        return {
          ok: false,
          message: `Insufficient stock for "${product.productName}". Available: ${available}, Requested: ${item.quantity}`,
        };
      }
    }
  }
  return { ok: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// PLACE ORDER  —  POST /api/orders/placeOrder
// ══════════════════════════════════════════════════════════════════════════════
exports.placeOrder = async (req, res) => {
  try {
    const body = req.body;

    // ── 1. Resolve userId ──────────────────────────────────────────────────────
    const userId = body.user ?? body.userId ?? null;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId / user is required." });
    }

    // ── 2. Resolve orderItems ──────────────────────────────────────────────────
    const rawItems = body.orderItems ?? body.products ?? [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: "Order must have at least one item." });
    }

    const orderItems = rawItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      name:      item.name      ?? item.productName ?? "",
      image:     item.image     ?? item.img         ?? "",
      quantity:  Number(item.quantity) || 1,
      price:     Number(item.price)    || 0,
    }));

    for (const item of orderItems) {
      if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({ success: false, message: `Invalid productId: ${item.productId}` });
      }
    }

    // ── 3. ✅ STOCK VALIDATION — order place karta pehla ──────────────────────
    const stockCheck = await validateStock(orderItems);
    if (!stockCheck.ok) {
      return res.status(400).json({ success: false, message: stockCheck.message });
    }

    // ── 4. Resolve deliveryAddress ─────────────────────────────────────────────
    const da = body.deliveryAddress ?? {};
    const sa = body.shippingAddress ?? {};

    const deliveryAddress = {
      fullName:   da.fullName   ?? `${sa.firstName ?? ""} ${sa.lastName ?? ""}`.trim() ?? "",
      phone:      da.phone      ?? sa.phone      ?? "",
      street:     da.street     ?? sa.address    ?? sa.street    ?? "",
      city:       da.city       ?? sa.city       ?? "",
      state:      da.state      ?? sa.state      ?? "Gujarat",
      postalCode: da.postalCode ?? sa.pinCode    ?? sa.postalCode ?? "",
      country:    da.country    ?? "India",
    };

    if (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.street) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is incomplete (fullName, phone, street required).",
      });
    }

    // ── 5. Pricing ─────────────────────────────────────────────────────────────
    const subtotal       = Number(body.subtotal)       || orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmount = Number(body.discountAmount) || 0;
    const deliveryCharge = Number(body.deliveryCharge) || 0;
    const totalAmount    = Number(body.totalAmount ?? body.total) || (subtotal - discountAmount + deliveryCharge);
    const paidAmount     = 0;

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid totalAmount." });
    }

    // ── 6. Payment ─────────────────────────────────────────────────────────────
    const rawMethod = (body.paymentMethod ?? "cod").toLowerCase().trim();
    const methodMap = {
      upi: "upi", card: "card",
      netbank: "netbanking", netbanking: "netbanking",
      cod: "cod", wallet: "wallet", emi: "emi",
    };
    const paymentMethod = methodMap[rawMethod] ?? "cod";

    // ── 7. Save order ──────────────────────────────────────────────────────────
    const order = await Order.create({
      user:            new mongoose.Types.ObjectId(userId),
      orderItems,
      subtotal,
      discountAmount,
      deliveryCharge,
      totalAmount,
      paidAmount,
      couponCode:      body.couponCode   ?? "",
      paymentMethod,
      paymentStatus:   "pending",
      transactionId:   "",
      orderStatus:     "pending",
      deliveryAddress,
      customerNote:    body.customerNote ?? "",
      isDeleted:       false,
    });

    // ── 8. ✅ STOCK RESERVE — order save thaya pachhi ─────────────────────────
    await updateStock(orderItems, "reserve");

    console.log(`✅ Order placed — ID: ${order._id} | User: ${userId} | Total: ₹${totalAmount}`);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order:   order,
      _id:     order._id,
    });

  } catch (error) {
    console.error("❌ placeOrder error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: `Validation failed: ${messages.join(", ")}` });
    }

    return res.status(500).json({ success: false, message: error.message || "Server error while placing order." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET ORDER BY ID  —  GET /api/orders/getOrderById/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findOne({ _id: id, isDeleted: false })
      .populate("orderItems.productId", "productName images basePrice stockQuantity reservedQuantity soldQuantity")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    return res.status(200).json({ success: true, data: order, order });
  } catch (error) {
    console.error("❌ getOrderById error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET ORDERS BY USER  —  GET /api/orders/getOrdersByUser/:userId
// ══════════════════════════════════════════════════════════════════════════════
exports.getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId." });
    }

    const orders = await Order.find({ user: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("orderItems.productId", "productName images basePrice")
      .lean();

    return res.status(200).json({ success: true, count: orders.length, data: orders, orders });
  } catch (error) {
    console.error("❌ getOrdersByUser error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET ALL ORDERS  —  GET /api/orders/getAllOrders  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("user",                 "name email phone")
      .populate("orderItems.productId", "productName images basePrice stockQuantity reservedQuantity soldQuantity")
      .lean();

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("❌ getAllOrders error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE ORDER STATUS  —  PUT /api/orders/updateStatus/:id  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id }          = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid orderStatus. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    // ── Fetch current order to check old status ────────────────────────────────
    const existingOrder = await Order.findOne({ _id: id, isDeleted: false });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const oldStatus = existingOrder.orderStatus;

    // ── Update status ──────────────────────────────────────────────────────────
    existingOrder.orderStatus = orderStatus;
    await existingOrder.save();

    // ── ✅ STOCK LOGIC based on status transition ──────────────────────────────
    if (orderStatus === "delivered" && oldStatus !== "delivered") {
      // reserved → sold
      await updateStock(existingOrder.orderItems, "sell");
      console.log(`📦 Stock sold — Order: ${id}`);

    } else if (orderStatus === "cancelled" && oldStatus !== "cancelled") {
      // reserved → back to stock
      await updateStock(existingOrder.orderItems, "release");
      console.log(`🔄 Stock released — Order: ${id}`);
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated.",
      data:    existingOrder,
    });
  } catch (error) {
    console.error("❌ updateOrderStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CANCEL ORDER  —  PATCH /api/orders/cancel/:id
// ══════════════════════════════════════════════════════════════════════════════
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findOne({ _id: id, isDeleted: false });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (!["pending", "processing"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.orderStatus}`,
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    // ── ✅ STOCK RELEASE — cancelled order na items wapas stock ma ─────────────
    await updateStock(order.orderItems, "release");
    console.log(`🔄 Stock released on cancel — Order: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data:    order,
    });
  } catch (error) {
    console.error("❌ cancelOrder error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SOFT DELETE ORDER  —  DELETE /api/orders/delete/:id  (Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    return res.status(200).json({ success: true, message: "Order deleted." });
  } catch (error) {
    console.error("❌ deleteOrder error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DEDUCT STOCK  —  POST /api/orders/deduct  (Manual override for Admin)
// ══════════════════════════════════════════════════════════════════════════════
exports.deductStock = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Products array is required." });
    }

    const updatedStockDetails = [];

    for (const item of products) {
      const { productId, variantId, quantity } = item;

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "productId and quantity are required for each item.",
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }

      if (product.hasVariants && variantId) {
        const variant = product.variants.id(variantId);
        if (!variant) {
          return res.status(404).json({ success: false, message: `Variant not found: ${variantId}` });
        }

        // ✅ Available = stockQty - reservedQty
        const available = variant.stockQuantity - (variant.reservedQuantity || 0);
        if (available < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.productName}" variant. Available: ${available}`,
          });
        }

        variant.stockQuantity -= quantity;
        variant.soldQuantity   = (variant.soldQuantity || 0) + quantity;
        await product.save();

        updatedStockDetails.push({
          productId,
          variantId,
          remainingStock: variant.stockQuantity,
          soldQuantity:   variant.soldQuantity,
        });

      } else {
        const available = (product.stockQuantity || 0) - (product.reservedQuantity || 0);
        if (available < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.productName}". Available: ${available}`,
          });
        }

        product.stockQuantity -= quantity;
        product.soldQuantity   = (product.soldQuantity || 0) + quantity;
        await product.save();

        updatedStockDetails.push({
          productId,
          remainingStock: product.stockQuantity,
          soldQuantity:   product.soldQuantity,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Stock deducted successfully.",
      updatedStockDetails,
    });
  } catch (error) {
    console.error("❌ deductStock error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};