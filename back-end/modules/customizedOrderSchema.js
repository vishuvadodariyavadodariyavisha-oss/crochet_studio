const mongoose = require("mongoose");

const customizationSchema = new mongoose.Schema(
  {
    // orderId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Order",
    //   required: true,
    // },

    userId: { // <--- link to User
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customerName: { type: String },  // ✅ add this
  customerEmail: { type: String },
  
    itemType: String,
    color: String,
    yarnType: String,
    size: String,

    customText: String,
    recipientName: String,
    occasion: String,
    specialInstructions: String,

    giftWrap: {
      type: Boolean,
      default: false,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    referenceImages: [String],

    messageAvailable: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customization", customizationSchema);