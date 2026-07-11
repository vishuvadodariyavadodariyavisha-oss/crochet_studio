// modules/bulkOrderSchema.js
const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productType: { type: String, default: '' },

    quantity:        { type: Number, required: true, min: 10 },
    designPreference: { type: String, default: '' },
    eventType:       { type: String, default: '' },
    deliveryDate:    { type: Date, default: null },
    customMessage:   { type: String, default: '' },

    // Colors
    yarnColors:     { type: [String], default: [] },
    primaryColor:   { type: String, default: '' },
    secondaryColor: { type: String, default: '' },
    colorNotes:     { type: String, default: '' },

    // Pricing
    unitPrice:       { type: Number, default: 0 },
    subtotal:        { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount:  { type: Number, default: 0 },
    finalAmount:     { type: Number, default: 0 },
    quotedPrice:     { type: Number, default: null },   // Admin sets this for quote orders

    // Order type
    orderType: {
      type: String,
      enum: ['direct', 'quote'],
      default: 'quote',
    },

    // Order status
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled'],
      default: 'requested',
    },

    // Payment (for direct orders — manual/offline)
    paymentMethod: {
      type: String,
      enum: ['cod', 'bank_transfer', 'upi', 'cash', ''],
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', ''],
      default: '',
    },
    upiId:  { type: String, default: '' },
    paidAt: { type: Date, default: null },

    // Admin communication
    adminNote: { type: String, default: '' },   // Admin note shown to user
  },
  { timestamps: true }
);

module.exports = mongoose.models.BulkOrder || mongoose.model('BulkOrder', bulkOrderSchema);