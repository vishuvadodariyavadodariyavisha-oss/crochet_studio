// routes/adminDashboardRouter.js
const express = require("express");
const router = express.Router();

const adminDashboardController = require("../controller/adminDashboardController");

// ── Dashboard Routes ──────────────────────────────────────────
router.get("/stats", async (req, res) => {
  await adminDashboardController.getDashboardStats(req, res);
});

router.get("/recent-orders", async (req, res) => {
  await adminDashboardController.getRecentOrders(req, res);
});

router.get("/low-stock", async (req, res) => {
  await adminDashboardController.getLowStockProducts(req, res);
});

module.exports = router;