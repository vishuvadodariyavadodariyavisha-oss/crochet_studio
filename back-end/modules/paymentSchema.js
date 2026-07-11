// ════════════════════════════════════════════════
// paymentSchema.js  (modules/paymentSchema.js)
// ════════════════════════════════════════════════
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // ✅ Dynamic ref — BulkOrder OR Customization OR regular Order
    orderId: {
      type:     mongoose.Schema.Types.ObjectId,
      refPath:  "orderModel",
      required: true,
    },
    orderModel: {
      type:    String,
      enum:    ["Customization", "BulkOrder", "Order"],  // ✅ "Order" added for shop orders
      default: "Customization",
    },

    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    amount: {
      type:     Number,
      required: true,
    },
    paymentMethod: {
      type:     String,
      enum:     ["upi", "card", "netbank", "cod"],
      required: true,
    },
    paymentType: {
      type:    String,
      enum:    ["full", "advance70", "advance", "remaining", "cod30"],
      default: "full",
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "success", "failed"],
      default: "pending",
    },
    transactionId: {
      type:   String,
      unique: true,
      sparse: true,   // ✅ null/undefined values skip unique check
    },

    // UPI fields
    upiId:  { type: String },
    upiApp: { type: String },

    // Card fields
    cardLast4: { type: String },
    cardName:  { type: String },

    // Net Banking
    bank: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);