// middleware/userAuth.js

const jwt = require("jsonwebtoken");
const User = require("../modules/userSchema"); // make sure the path is correct

const userAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔹 Check if header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    // 🔹 Extract token properly
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    // 🔹 Check secret exists
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error("JWT secret key not configured");
    }

    // 🔹 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 🔹 Use correct field for user ID (depends on what you put in the token)
    // Here, I'm assuming you used { id: user._id } when signing
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Token does not contain user ID",
      });
    }

    // 🔹 Fetch full user document from DB (without password)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 Attach full user to request
    req.user = user; // ✅ now req.user has _id, name, email, phone, etc.

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = userAuth;