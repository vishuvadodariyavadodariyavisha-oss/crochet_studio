const mongoose = require("mongoose");
const Customization = require("../modules/customizedOrderSchema");
const User = require("../modules/userSchema");

// ─── Create Customization Controller ─────
exports.createCustomization = async (req, res) => {
  try {
    // 🔹 Ensure auth middleware has attached user
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not logged in",
      });
    }

    // 🔹 Fetch full user document from DB (name, email, etc.)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔹 Build customization object
    const customizationData = {
      ...req.body,           // other customization fields from frontend
      userId: user._id,      // link customization to user
      customerName: user.name,   // snapshot of name
      customerEmail: user.email, // snapshot of email
    };

    // 🔹 Create customization in DB
    const newCustomization = await Customization.create(customizationData);

    // 🔹 Respond success
    res.status(201).json({
      success: true,
      message: "Customization submitted successfully",
      data: newCustomization,
    });

  } catch (error) {
    console.error("Error creating customization:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get All Customizations (Admin) ──────────────────────────────────────────
exports.getAllCustomizations = async (req, res) => {
  try {
    const customizations = await Customization.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customizations.length,
      data: customizations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Single Customization by _id ─────────────────────────────────────────
exports.getSingleCustomization = async (req, res) => {
  try {
    const customization = await Customization.findById(req.params.id);

    if (!customization) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, data: customization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Status + totalAmount (Approve / Reject) ──────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, totalAmount, rejectionReason } = req.body;

    const updateFields = { status };

    // When approving, admin can also set totalAmount
    if (totalAmount !== undefined) {
      updateFields.totalAmount = totalAmount;
    }

    // When rejecting, save the reason
    if (status === "rejected" && rejectionReason) {
      updateFields.rejectionReason = rejectionReason;
    }

    const updated = await Customization.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Toggle Message Availability ─────────────────────────────────────────────
exports.toggleMessage = async (req, res) => {
  try {
    const customization = await Customization.findById(req.params.id);

    if (!customization) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    customization.messageAvailable = !customization.messageAvailable;
    await customization.save();

    res.status(200).json({
      success: true,
      message: "Message availability updated",
      data: customization,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Customization ─────────────────────────────────────────────────────
exports.deleteCustomization = async (req, res) => {
  try {
    const deleted = await Customization.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({
      success: true,
      message: "Customization deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Customization by its _id (used by Payment Page) ─────────────────────
// Route: GET /api/customization/getOne/:orderId
// The frontend sends the customization document's _id as :orderId
exports.getCustomizationByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    // ✅ FIX: use findById(orderId) — NOT findById({ orderId })
    const customization = await Customization.findById(orderId);

    if (!customization) {
      return res.status(404).json({
        success: false,
        message: "Customization not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customization,
    });
  } catch (error) {
    console.error("Get Customization Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── Get All Orders for a Specific User ──────────────────────────────────────
// Route: GET /api/customization/my-orders/:userId
exports.getMyOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    // validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const orders = await Customization
      .find({ userId })
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No customized orders found",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    const updated = await Customization.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};