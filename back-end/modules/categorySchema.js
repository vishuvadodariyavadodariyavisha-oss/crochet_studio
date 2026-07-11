const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryName: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { type: String, default: "" },
  image: { type: String, default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

// ✅ Case-insensitive unique index
categorySchema.index(
  { categoryName: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model('Category', categorySchema);