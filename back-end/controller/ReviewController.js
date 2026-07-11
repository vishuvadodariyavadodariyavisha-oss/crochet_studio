const Review = require('../modules/reviewSchema');
const mongoose = require("mongoose");

// POST /api/review/addReview
const addReview = async (req, res) => {
  try {
    const { productId, userId, userName, rating, reviewText } = req.body;

    if (!productId || !userId || !rating || !userName) {
      return res.status(400).json({ message: "productId, userId, userName and rating are required." });
    }

    // Check if user already reviewed this product
    const existing = await Review.findOne({ productId, userId });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }

    const review = new Review({ productId, userId, userName, rating, reviewText });
    await review.save();

    res.status(201).json({ message: "Review added successfully.", review });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// GET /api/review/getReviewsByProduct/:productId
const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId, status: 'approved' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ reviews });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// DELETE /api/review/deleteReview/:reviewId
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.status(200).json({ message: "Review deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

// PATCH /api/review/updateStatus/:reviewId  (Admin use)
const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!['approved', 'hidden'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'hidden'." });
    }

    const review = await Review.findByIdAndUpdate(reviewId, { status }, { new: true });
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.status(200).json({ message: "Status updated.", review });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ reviews });
  } catch (err) {
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

module.exports = { addReview, getReviewsByProduct, deleteReview, updateReviewStatus,getAllReviews};