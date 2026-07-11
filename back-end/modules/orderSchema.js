const mongoose = require("mongoose");

// ── Order Item Sub-Schema ─────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name:     String,
  image:    String,
  quantity: { type: Number, required: true, min: 1 },
  price:    { type: Number, required: true },

  customColor:         String,
  customSize:          String,
  customText:          String,
  specialInstructions: String,
});

// ── Main Order Schema ─────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one item",
      },
    },

    subtotal:       { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount:    { type: Number, required: true },
    paidAmount:     { type: Number, default: 0 },

    couponCode: { type: String, default: "" },

    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "cod", "wallet", "emi"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "failed", "refunded"],
      default: "pending",
    },
    transactionId: { type: String, default: "" },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    deliveryAddress: {
      fullName:   String,
      phone:      String,
      street:     String,
      city:       String,
      state:      String,
      postalCode: String,
      country:    { type: String, default: "India" },
    },

    customerNote: { type: String, default: "" },
    isDeleted:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── કોઈ middleware નથી — stock management controller માં handle થાય છે ──────
// orderController.js માં updateStock() already છે:
//   placeOrder       → updateStock("reserve")
//   updateOrderStatus → updateStock("sell") / updateStock("release")
//   cancelOrder      → updateStock("release")

module.exports = mongoose.model("Order", orderSchema);