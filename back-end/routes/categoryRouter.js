const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categoryController");
const upload = require("../middleware/upload");

// Create Category
router.post(
  "/add-categories",
  upload.single("image"), // image field in form-data
  categoryController.createCategory
);
//http://localhost:5000/api/category/add-categories

// Get All Categories
router.get("/categories", categoryController.getAllCategories);
//http://localhost:5000/api/category/categories

// Update Category
router.put(
  "/categories/:id",
  upload.single("image"), // optional image
  categoryController.updateCategory
);
//http://localhost:5000/api/category/categories/6999b2326fc0bf43bf8a31c0

// Delete Category
router.delete("/categories/:id", categoryController.deleteCategory);
//http://localhost:5000/api/category/categories/6999b2326fc0bf43bf8a31c0

module.exports = router;