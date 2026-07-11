const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:{type : String , required : true},
  rating: { type: Number, min: 1, max: 5, required: true },
  reviewText: { type: String },
  status: { type: String, enum: ['approved', 'hidden'], default: 'approved' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);