const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../modules/userSchema');
const Order = require("../modules/orderSchema");

// ================= REGISTER =================
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    let addresses = [];
    if (req.body.addresses) {
      addresses = JSON.parse(req.body.addresses);
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, Email and Password are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileImage = req.file ? req.file.path : "";

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      profileImage,
      addresses
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profileImage: newUser.profileImage,
        addresses: newUser.addresses
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ================= LOGIN =================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required"
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    user.lastActive = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        status: user.status,
        lastActive: user.lastActive
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ================= GET PROFILE =================
const getUserProfile = async (req, res) => {
  try {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const user = req.user;

    /* ==============================
       1️⃣  MERGE ALL ADDRESSES
    ============================== */
    let mergedAddress = null;

    if (user.addresses && user.addresses.length > 0) {

      // Get default address first
      const defaultAddress =
        user.addresses.find(addr => addr.isDefault) || user.addresses[0];

      mergedAddress = `${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.state} - ${defaultAddress.zip}`;
    }

    /* ==============================
       2️⃣  GET USER ORDERS
    ============================== */
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;

    const totalSpent = orders.reduce(
      (acc, order) => acc + (order.totalAmount || 0),
      0
    );

    /* ==============================
       3️⃣  RESPONSE
    ============================== */
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: mergedAddress,
        joinedDate: user.createdAt,
        status: user.status,
        profileImage: user.profileImage
          ? `${req.protocol}://${req.get("host")}/uploads/users/${user.profileImage}`
          : null,

        totalOrders,
        totalSpent,
        orders   // 🔥 Full orders array
      }
    });

  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// ================= UPDATE PROFILE =================
const fs = require("fs");
const path = require("path");

const updateUserProfile = async (req, res) => {
  try {
    const user = req.user;

    const { name, phone, address } = req.body;

    // 🔹 Text fields update
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    // 🔹 Profile Image update (jo image aave to)
    if (req.file) {

      // 🗑 Old image delete karo (jo exist kare)
      if (user.profileImage) {
        const oldPath = path.join("uploads/users/", user.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // 🆕 New image save
      user.profileImage = req.file.filename;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// ================= CHANGE PASSWORD =================
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id; // coming from userAuth middleware
    const { currentPassword, newPassword } = req.body;

    // 1️⃣ Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    // 2️⃣ Get user with password field
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 3️⃣ Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // 4️⃣ Prevent same password reuse
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as current password"
      });
    }

    // 5️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ================= DELETE ACCOUNT (HARD) =================
const deleteAccountPermanently = async (req, res) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account permanently deleted"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ================= GET MY RECENT ORDERS =================
// Add this function in your userController.js

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit  = parseInt(req.query.limit) || 10;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })          // Latest first
      .limit(limit)
      .populate("items.product", "name images price"); // adjust field names as per your schema

    res.status(200).json({
      success: true,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ── Add to module.exports ──
// module.exports = { ..., getMyOrders };

// ── Add to userRoutes.js ──
// router.get("/my-orders", userAuth, userController.getMyOrders);

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccountPermanently,
  getMyOrders
};