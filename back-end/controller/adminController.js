const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../modules/adminSchema');
const User = require('../modules/userSchema'); // path to your User model

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email
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

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update user status (active <-> blocked)
const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value."
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully.", user });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  loginAdmin,
  getUsers,
  updateUserStatus,
  deleteUser
};