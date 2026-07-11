const express = require("express");
const router = express.Router();
const userAuth = require("../middleware/userAuth"); // ← import it
const controller = require("../controller/customizedOrderContoller")

// ── Customer Routes ──────────────────────────────────────
router.post("/create", userAuth,      controller.createCustomization); // ← add userAuth
router.get("/getAll",                 controller.getAllCustomizations);
router.get("/getOne/:orderId",        controller.getCustomizationByOrderId);  // used by Payment page
router.get("/my-orders/:userId",      controller.getMyOrders);                // used by My Orders page

// ── Admin Routes ─────────────────────────────────────────
router.get("/get/:id",                controller.getSingleCustomization);
router.put("/update-status/:id",      controller.updateStatus);               // also sets totalAmount
router.put("/toggle-message/:id",     controller.toggleMessage);
router.delete("/delete/:id",          controller.deleteCustomization);

// ── Order Actions ─────────────────────────────────────────
router.patch("/cancel/:id",           controller.cancelOrder);

module.exports = router;