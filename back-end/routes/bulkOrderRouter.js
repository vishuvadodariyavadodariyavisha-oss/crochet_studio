// routes/bulkOrderRoutes.js
const express = require('express');
const router  = express.Router();
const bulkorderController = require('../controller/bulkOrderController');

// ── IMPORTANT: Static paths BEFORE dynamic /:id ──────────────────────────────

// User routes
router.post('/createBulkOrder',            bulkorderController.createBulkOrder);
router.get('/getMyBulkOrders/:userId',     bulkorderController.getMyBulkOrders);

// Admin routes
router.get('/getAllBulkOrders',            bulkorderController.getAllBulkOrders);
router.put('/:id/status',                  bulkorderController.updateBulkOrderStatus);
router.put('/:id/quote',                   bulkorderController.updateBulkOrderQuote);
router.delete('/deleteBulkOrder/:id',      bulkorderController.deleteBulkOrder);  // ✅ slash fix

// Dynamic route — MUST be LAST (otherwise "all", "user" will match as :id)
router.get('/getBulkOrderById/:id',        bulkorderController.getBulkOrderById);

module.exports = router;