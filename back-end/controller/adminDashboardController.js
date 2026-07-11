// controllers/admin/dashboardController.js

const Order = require("../modules/orderSchema");
const Product = require("../modules/productSchema");
const User = require("../modules/userSchema");

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats
// ─────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueData,
      lowStockProducts,
      pendingOrders,
    ] = await Promise.all([
      // Total users (non-deleted)
      User.countDocuments(),

      // Total active products
      Product.countDocuments({ isActive: true }),

      // Total non-deleted orders
      Order.countDocuments({ isDeleted: false }),

      // Revenue: sum of totalAmount for delivered + paid orders
      Order.aggregate([
        {
          $match: {
            isDeleted: false,
            orderStatus: "delivered",
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      // Low stock: variants with stockQuantity <= 5
      Product.countDocuments({
        isActive: true,
        "variants.stockQuantity": { $lte: 5 },
      }),

      // Pending orders count
      Order.countDocuments({
        isDeleted: false,
        orderStatus: "pending",
      }),
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        lowStockCount: lowStockProducts,
        pendingOrders,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/recent-orders
// ─────────────────────────────────────────────────────────────
const getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email phone")   // User model has: name, email, phone
      .lean();

    const formatted = orders.map((order) => ({
      _id: order._id,
      customerName: order.user?.name || "Unknown",
      customerEmail: order.user?.email || "",

      // First item name as product name (order has multiple items)
      productName:
        order.orderItems?.length > 0
          ? order.orderItems[0].name +
            (order.orderItems.length > 1
              ? ` +${order.orderItems.length - 1} more`
              : "")
          : "Unknown Product",

      totalItems: order.orderItems?.length || 0,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,

      // Delivery city for quick info
      deliveryCity: order.deliveryAddress?.city || "",
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("getRecentOrders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/low-stock
// Products where any variant has stockQuantity <= 5
// ─────────────────────────────────────────────────────────────
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      "variants.stockQuantity": { $lte: 5 },
    })
      .select("productName images variants basePrice")
      .populate("categoryId", "name")
      .lean();

    const formatted = products.map((product) => {
      // Only return low-stock variants
      const lowVariants = product.variants.filter((v) => v.stockQuantity <= 5);
      return {
        _id: product._id,
        productName: product.productName,
        image: product.images?.[0] || "",
        category: product.categoryId?.name || "",
        lowStockVariants: lowVariants.map((v) => ({
          variantName: v.variantName,
          stockQuantity: v.stockQuantity,
          sku: v.sku,
        })),
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("getLowStockProducts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getLowStockProducts,
};