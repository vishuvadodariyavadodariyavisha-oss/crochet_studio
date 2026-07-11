const express = require('express');
const router = express.Router();
const productController = require("../controller/productContoller");
const upload = require("../middleware/upload")

// For authentication middleware (optional)
// const { adminAuth } = require('../middleware/auth');

// POST /products
router.post('/add-product', upload.array('images', 5), productController.createProduct);
//http://localhost:5000/api/product/add-product

router.get('/getAllProducts', productController.getAllProducts);
//http://localhost:5000/api/product/getAllProducts

router.get("/getProductsByCategory/:categoryId", productController.getProductsByCategory);

router.get("/getProductById/:productId", productController.getProductById);

router.get("/getInventoryStats",  productController.getInventoryStats);

router.put("/updateVariantStock", productController.updateVariantStock);

router.put("/updateProduct/:id",    upload.array("images"), productController.updateProduct);

router.delete("/deleteProduct/:id", productController.deleteProduct);

module.exports = router;