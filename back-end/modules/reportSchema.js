const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportType: { type: String, enum: ['daily', 'monthly'] },
  totalSales: { type: Number },
  totalOrders: { type: Number },
  topProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);