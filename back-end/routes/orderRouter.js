const express = require("express");
const router  = express.Router();

const {
  placeOrder,
  getOrderById,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  deductStock,
} = require("../controller/orderController"); // ✅ adjust path if needed

// ── POST /api/orders/placeOrder  — Place new order (from checkout)
router.post("/placeOrder", placeOrder);

// ── POST /api/orders/deduct  — Deduct stock after payment
router.post("/deduct", deductStock);

// ── GET /api/orders/getAllOrders  — All orders (Admin)
router.get("/getAllOrders", getAllOrders);

// ── GET /api/orders/getOrdersByUser/:userId  — Orders by user
router.get("/getOrdersByUser/:userId", getOrdersByUser);

// ── PUT /api/orders/updateStatus/:id  — Update order status (Admin)
router.put("/updateStatus/:id", updateOrderStatus);

// ── PATCH /api/orders/cancel/:id  — Cancel order
router.patch("/cancel/:id", cancelOrder);

// ── DELETE /api/orders/delete/:id  — Soft delete (Admin)
router.delete("/delete/:id", deleteOrder);

// ── GET /api/orders/getOrderById/:id  — Single order  ⚠️ Keep LAST (generic :id)
router.get("/getOrderById/:id", getOrderById);

module.exports = router;