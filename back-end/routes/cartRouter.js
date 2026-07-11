const express = require('express');
const router = express.Router();
const cartController = require('../controller/cartController');

// Add item to cart
router.post("/addToCart", cartController.addToCart);

// Get user cart by userId
router.get("/getUserCart/:userId", cartController.getUserCart);

// // Remove product from cart by userId + productId
// router.delete("/removeCartItem/:userId/:productId", cartController.removeCartItem);

// // Update quantity of product in cart by userId + productId
// router.put("/updateCartItem/:userId/:productId", cartController.updateCartItem);

router.post("/removeCartItem", cartController.removeCartItem);   // ✅ POST (not DELETE) — body reliable rahe

router.put("/updateCartItem", cartController.updateCartItem);    // ✅ no param

router.post("/add-customized", cartController.addToCartCustomized);

module.exports = router;