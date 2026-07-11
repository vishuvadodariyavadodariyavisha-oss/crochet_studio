const mongoose = require("mongoose");
const Wishlist = require("../modules/wishlistSchema");

// Toggle Wishlist (Add if not exists, Remove if exists)
const toggleWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "UserId and ProductId are required" });
    }

    const existingWishlistItem = await Wishlist.findOne({ userId, productId });

    if (existingWishlistItem) {
      await Wishlist.findByIdAndDelete(existingWishlistItem._id);
      return res.status(200).json({ 
        message: "Removed from wishlist", 
        status: "removed" 
      });
    } else {
      const newItem = new Wishlist({ userId, productId });
      await newItem.save();
      return res.status(201).json({ 
        message: "Added to wishlist", 
        status: "added", 
        data: newItem 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User's Wishlist
const getUserWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    const wishlist = await Wishlist.find({ userId }).populate("productId");

    res.status(200).json({
      message: "Wishlist fetched successfully",
      data: wishlist
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  toggleWishlist,
  getUserWishlist
};