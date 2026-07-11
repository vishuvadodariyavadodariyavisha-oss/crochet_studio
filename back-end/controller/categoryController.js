const mongoose = require("mongoose");
const Category = require("../modules/categorySchema");
const fs = require("fs");
const path = require("path");

const createCategory = async (req, res) => {
  try {
    const { categoryName, description, status } = req.body;

    // Validation
    if (!categoryName || categoryName.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Case-insensitive duplicate check
    const existingCategory = await Category.findOne({
      categoryName: { $regex: `^${categoryName.trim()}$`, $options: "i" }
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Optional image
    const imagePath = req.file ? req.file.path : null;

    const newCategory = new Category({
      categoryName: categoryName.trim(),
      description: description || "",
      image: imagePath,
      status: status || "active"
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Categories fetched successfully",
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};

// UPDATE category
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { categoryName, description, status } = req.body;

    // Find category by ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Case-insensitive duplicate check if categoryName changed
    if (categoryName && categoryName.trim() !== category.categoryName) {
      const existingCategory = await Category.findOne({
        categoryName: { $regex: `^${categoryName.trim()}$`, $options: "i" },
        _id: { $ne: categoryId } // exclude current category
      });
      if (existingCategory) {
        return res.status(400).json({ message: "Category name already exists" });
      }
    }

    // Update fields
    if (categoryName) category.categoryName = categoryName.trim();
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    // Optional: replace image
    if (req.file) {
      // Delete old image if exists
      if (category.image && fs.existsSync(category.image)) {
        fs.unlinkSync(category.image);
      }
      category.image = req.file.path;
    }

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE category by ID
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image file if exists
    if (category.image && fs.existsSync(category.image)) {
      fs.unlinkSync(category.image);
    }

    // Delete category from DB
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports={
 createCategory,
 getAllCategories,
 updateCategory,
 deleteCategory
};