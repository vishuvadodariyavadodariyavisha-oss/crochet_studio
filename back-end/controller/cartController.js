const mongoose = require("mongoose");
const Cart    = require("../modules/cartSchema");
const Product = require("../modules/productSchema");

// ── Helper: available stock calculate karo ─────────────────────────────────
function getAvailable(stockQty, reservedQty) {
  return Math.max(0, (stockQty || 0) - (reservedQty || 0));
}

// ─── Add item to cart ──────────────────────────────────────────────────────
const addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity = 1, variantId = null } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "UserId and ProductId required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ STOCK VALIDATION — available = stockQty - reservedQty
    if (variantId) {
      const variant = product.variants.find(
        (v) => v._id.toString() === variantId.toString()
      );
      if (!variant)    return res.status(404).json({ message: "Variant not found" });
      if (!variant.isActive) return res.status(400).json({ message: "This variant is no longer available" });

      const available = getAvailable(variant.stockQuantity, variant.reservedQuantity);
      if (available < quantity) {
        return res.status(400).json({
          message: `Only ${available} items available in stock`,
          availableStock: available,
        });
      }
    } else {
      // ✅ Non-variant product stock check
      const available = getAvailable(product.stockQuantity, product.reservedQuantity);
      if (available < quantity) {
        return res.status(400).json({
          message: `Only ${available} items available in stock`,
          availableStock: available,
        });
      }
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, products: [{ productId, variantId, quantity }] });
    } else {
      const existingProduct = cart.products.find(
        (item) =>
          item.productId.toString() === productId &&
          (item.variantId?.toString() || null) === (variantId?.toString() || null)
      );

      if (existingProduct) {
        // ✅ Cart ma already existing qty + new qty check
        const newTotal = existingProduct.quantity + quantity;

        if (variantId) {
          const variant = product.variants.find(
            (v) => v._id.toString() === variantId.toString()
          );
          const available = getAvailable(variant?.stockQuantity, variant?.reservedQuantity);
          if (newTotal > available) {
            return res.status(400).json({
              message: `Cannot add more. Only ${available} items available (${existingProduct.quantity} already in cart)`,
              availableStock: available,
            });
          }
        } else {
          const available = getAvailable(product.stockQuantity, product.reservedQuantity);
          if (newTotal > available) {
            return res.status(400).json({
              message: `Cannot add more. Only ${available} items available (${existingProduct.quantity} already in cart)`,
              availableStock: available,
            });
          }
        }

        existingProduct.quantity += quantity;
      } else {
        cart.products.push({ productId, variantId, quantity });
      }
    }

    await cart.save();
    res.status(201).json({ message: "Product added to cart", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get user cart ─────────────────────────────────────────────────────────
const getUserCart = async (req, res) => {
  try {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      // ✅ reservedQuantity select karo — frontend ne available calculate karvani jarur pade
      select: "productName basePrice discount images variants hasVariants isActive stockQuantity reservedQuantity",
    });

    if (!cart) {
      return res.status(200).json({ userId, products: [] });
    }

    res.status(200).json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Remove product from cart ──────────────────────────────────────────────
const removeCartItem = async (req, res) => {
  try {
    const { userId, productId, variantId = null } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "UserId and ProductId required" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const beforeCount = cart.products.length;

    cart.products = cart.products.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          (item.variantId?.toString() || null) === (variantId?.toString() || null)
        )
    );

    if (cart.products.length === beforeCount) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await cart.save();
    res.status(200).json({ message: "Item removed successfully", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Update quantity of product ────────────────────────────────────────────
const updateCartItem = async (req, res) => {
  try {
    const { userId, productId, variantId = null, action } = req.body;

    if (!userId || !productId || !action) {
      return res.status(400).json({ message: "userId, productId and action required" });
    }

    if (!["increment", "decrement"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'increment' or 'decrement'" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.products.find(
      (p) =>
        p.productId.toString() === productId &&
        (p.variantId?.toString() || null) === (variantId?.toString() || null)
    );

    if (!item) return res.status(404).json({ message: "Product not found in cart" });

    if (action === "increment") {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // ✅ available = stockQty - reservedQty check on increment
      if (variantId) {
        const variant = product.variants.find(
          (v) => v._id.toString() === variantId.toString()
        );
        if (variant) {
          const available = getAvailable(variant.stockQuantity, variant.reservedQuantity);
          if (item.quantity >= available) {
            return res.status(400).json({
              message: `Only ${available} items available in stock`,
              availableStock: available,
            });
          }
        }
      } else {
        const available = getAvailable(product.stockQuantity, product.reservedQuantity);
        if (item.quantity >= available) {
          return res.status(400).json({
            message: `Only ${available} items available in stock`,
            availableStock: available,
          });
        }
      }

      item.quantity += 1;

    } else if (action === "decrement") {
      item.quantity -= 1;
      if (item.quantity < 1) {
        // Auto remove if quantity hits 0
        cart.products = cart.products.filter(
          (p) =>
            !(
              p.productId.toString() === productId &&
              (p.variantId?.toString() || null) === (variantId?.toString() || null)
            )
        );
      }
    }

    await cart.save();
    res.status(200).json({ message: "Cart updated successfully", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Add to cart (Customized) ──────────────────────────────────────────────
const addToCartCustomized = async (req, res) => {
  try {
    const {
      userId,
      productId,
      quantity   = 1,
      variantId  = null,
      customText = null,
      selectedSize = null,
      instructions = null,
    } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "UserId and ProductId are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const isCustom = customText || selectedSize || instructions;

    // ✅ STOCK VALIDATION — variant and non-variant both
    if (variantId) {
      const variant = product.variants.find((v) => v._id.toString() === variantId.toString());
      if (!variant)         return res.status(404).json({ message: "Variant not found" });
      if (!variant.isActive) return res.status(400).json({ message: "This variant is no longer available" });

      const available = getAvailable(variant.stockQuantity, variant.reservedQuantity);
      if (available < quantity) {
        return res.status(400).json({
          message: `Only ${available} items available in stock`,
          availableStock: available,
        });
      }
    } else {
      // ✅ Non-variant product stock check (was missing before)
      const available = getAvailable(product.stockQuantity, product.reservedQuantity);
      if (available < quantity) {
        return res.status(400).json({
          message: `Only ${available} items available in stock`,
          availableStock: available,
        });
      }
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const existingItem = cart.products.find((item) => {
      if (isCustom) {
        return (
          item.productId.toString() === productId &&
          item.customText   === (customText    || "") &&
          item.selectedSize === (selectedSize  || "") &&
          item.instructions === (instructions  || "")
        );
      } else {
        return (
          item.productId.toString() === productId &&
          (item.variantId?.toString() || null) === (variantId?.toString() || null)
        );
      }
    });

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.products.push({
        productId,
        variantId:    variantId    || null,
        quantity,
        customText:   customText   || "",
        selectedSize: selectedSize || "",
        instructions: instructions || "",
      });
    }

    await cart.save();
    return res.status(201).json({ message: "Product added to cart", cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addToCart,
  getUserCart,
  removeCartItem,
  updateCartItem,
  addToCartCustomized,
};