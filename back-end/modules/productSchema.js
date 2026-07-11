const mongoose = require("mongoose");

// Variant Schema
const variantSchema = new mongoose.Schema({
  variantName: { type: String, required: true },

  variantType: { 
    type: String,
    enum: ['size', 'layers', 'petals', 'color', 'custom', 'petalType'],
    required: true
  },

  layers: { 
    type: String, 
    enum: ['1-layer', '2-layer', '3-layer', '20', null], 
    default: null 
  },

  petalType: { 
    type: String, 
    enum: ['open', 'close', 'long', 'medium', 'open-close', null], 
    default: null 
  },

  size: { 
    type: String, 
    enum: ['small', 'medium', 'large', 'extra-large', null], 
    default: null 
  },

  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },

  images: [{ type: String }],

  stockQuantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  soldQuantity: { type: Number, default: 0 },

  sku: { type: String, unique: true },

  isActive: { type: Boolean, default: true }

});


// Product Schema
const productSchema = new mongoose.Schema({

  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },

  productName: { type: String, required: true },

  description: { type: String },

  basePrice: { type: Number, required: true },

  discount: { type: Number, default: 0 },

  images: [{ type: String }],

  variants: [variantSchema],

  hasVariants: { type: Boolean, default: false },

  stockQuantity: { type: Number, default: 0 },

  reservedQuantity: { type: Number, default: 0 },

  soldQuantity: { type: Number, default: 0 },

  material: { type: String, default: "Cotton Yarn" },

  color: [{ type: String }],

  isCustomizable: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true }

}, { timestamps: true });


// Virtual Field
productSchema.virtual('availableQuantity').get(function () {
  return this.stockQuantity - this.reservedQuantity;
});


// Export Model
module.exports = mongoose.model("Product", productSchema);