const express = require("express");
const router  = express.Router();

const {
  createPayment,
  getAllPayments,
  getPaymentsByUser,
  getPaymentById,
  updatePaymentStatus,
  deletePayment,
} = require("../controller/paymentController"); // ✅ adjust path if needed

// ── POST /api/payment/create  — Create new payment (frontend calls this)
router.post("/create", createPayment);

// ── GET /api/payment/all  — Get all payments (Admin)
router.get("/all", getAllPayments);

// ── GET /api/payment/user/:userId  — Get payments by user
router.get("/user/:userId", getPaymentsByUser);

// ── PUT /api/payment/status/:id  — Update payment status (Admin)
router.put("/status/:id", updatePaymentStatus);

// ── DELETE /api/payment/:id  — Delete payment (Admin)
router.delete("/:id", deletePayment);

// ── GET /api/payment/:id  — Get single payment by ID
// ⚠️ IMPORTANT: This must stay LAST — generic /:id catches everything above if placed first
router.get("/:id", getPaymentById);

module.exports = router;