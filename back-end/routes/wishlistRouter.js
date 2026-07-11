const express = require('express');
const router = express.Router();
const wishlistController = require('../controller/wishlistController');

router.post("/toggle", async (req, res) => {
    await wishlistController.toggleWishlist(req, res);
});

router.get("/getUserWishlist/:userId", async (req, res) => {
    await wishlistController.getUserWishlist(req, res);
});

module.exports = router;