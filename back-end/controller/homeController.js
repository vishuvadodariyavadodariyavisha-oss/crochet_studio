// controller/homeController.js

const Category = require('../modules/categorySchema');
const Product = require('../modules/productSchema');

/**
 * @desc    Get Home Page Data
 * @route   GET /api/home
 * @access  Public
 */
const getHomeData = async (req, res) => {
  try {
    // ── Top 3 active categories (latest) ──
    const categories = await Category.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('categoryName description image');

    // ── Top 8 active products (latest) ──
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('productName basePrice discount images categoryId hasVariants variants')
      .populate('categoryId', 'categoryName');

    return res.status(200).json({
      success: true,
      categories,
      products,
    });

  } catch (error) {
    console.error('Home API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch home data',
      error: error.message,
    });
  }
};

module.exports = {
  getHomeData
};