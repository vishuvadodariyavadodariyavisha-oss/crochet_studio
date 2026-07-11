const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  availableStock: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
  lowStockAlert: { type: Boolean, default: false }
});

module.exports = mongoose.model('Inventory', inventorySchema);