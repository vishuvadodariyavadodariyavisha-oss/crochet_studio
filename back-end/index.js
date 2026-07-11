require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./database/connection");

const adminRoutes = require("./routes/adminRouter");
const userRoutes = require("./routes/userRouter");
const categoryRoutes = require("./routes/categoryRouter");
const productRoutes = require("./routes/productRouter");
const customizationRoutes = require("./routes/customizedOrderRouter");
const cartRoutes = require("./routes/cartRouter");
const wishlistRoutes = require("./routes/wishlistRouter");
const orderRoutes = require("./routes/orderRouter");
const bulkOrderRoutes = require("./routes/bulkOrderRouter");
const contactRoutes = require("./routes/contactRouter");
const paymentRoutes = require("./routes/paymentRouter");
const reviewRoutes = require("./routes/reviewRouter");
const dashboardRoutes = require("./routes/adminDashboardRouter");
const homeRoutes = require("./routes/homeRouter")

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ✅ dashboard route પહેલા — /api/admin સાથે conflict ટાળવા
app.use("/api/admin/dashboard", dashboardRoutes);
app.use('/api', homeRoutes);

// બાકી routes
app.use("/api/admin", adminRoutes);
app.use('/api/user', userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/customization", customizationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bulkorders", bulkOrderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/review", reviewRoutes);

app.get("/", (req, res) => {
  res.send("API is working! Welcome to the backend.");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});