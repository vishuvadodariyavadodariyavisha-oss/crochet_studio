const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },

  profileImage: { 
    type: String, 
    default: ""   // will store image URL or file path
  },

  addresses: [{
    street: String,
    city: String,
    state: String,
    zip: String,
    isDefault: { type: Boolean, default: false }
  }],

  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  lastActive: {type: Date,default: null}
});

module.exports = mongoose.model('User', userSchema);