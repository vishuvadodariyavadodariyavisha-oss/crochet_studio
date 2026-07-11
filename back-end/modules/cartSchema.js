const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },

  variantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  },

  quantity: { 
    type: Number, 
    default: 1,
    min: 1
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",   // ⚠️ your user model name is 'User'
    required: true,
    unique: true   // one cart per user
  },

  products: [cartItemSchema]

}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);