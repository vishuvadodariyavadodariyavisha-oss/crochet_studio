// middleware/adminAuth.js

const jwt = require('jsonwebtoken');
const Admin = require('../modules/adminSchema');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.admin = admin;
    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuth;