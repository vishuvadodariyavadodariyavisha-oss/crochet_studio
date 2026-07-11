import React from "react";
import { Routes, Route } from "react-router-dom";

import UserLayout from "./layouts/userLayout";
import AdminLayout from "./layouts/adminLayout";

// User Pages
import Home from "./pages/Home";
import Product from "./pages/Product";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import CheckOut from "./pages/CheckOut";
import Contact from "./pages/Contact";
import Wishlist from "./pages/Wishlist";
import AboutUs from "./pages/AboutUs";
import Terms from "./pages/Terms";
import BuyerPro from "./buyer/BuyerPro";
import Login from "./pages/Login";
import Regi from "./pages/Regi";
import BulkOrder from "./buyer/BulkOrder";
import CustomizeOrder from "./buyer/customizeOrder";
import MyCustomOrders from "./buyer/MyCorders";
import Payment from "./pages/payment";

// Admin Pages
import Dashboard from "./Admin/DashBoard";
import AdminProduct from "./Admin/AdminProduct";
import UserMang from "./Admin/UserMang";
import Adminorder from "./Admin/Adminorder";
import AdminReport from "./Admin/AdminReport";
import AdminCategory from "./Admin/AdminCategory"
import AdminReview from "./Admin/AdminReview"
import AdminCustomization from "./Admin/AdminCustomization";
import AdminBulkOrder from "./Admin/adminBulkOrder";
import AdminInventory from "./Admin/AdminInventory"

export default function AppRoutes() {
  return (
    <Routes>

      {/* USER ROUTES */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
          <Route path="/productDetail/:productId" element={<ProductDetail />} />
          <Route path="/Cart" element={<Cart />} />
        <Route path="/CheckOut" element={<CheckOut />} /> 
        <Route path="/Contact" element={<Contact />} />
        <Route path="/Wishlist" element={<Wishlist />} />
        <Route path="/AboutUs" element={<AboutUs />} />
        <Route path="/Terms" element={<Terms />} />
        <Route path="/BuyerPro" element={<BuyerPro />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Regi" element={<Regi />} />
        <Route path="/BulkOrder" element={<BulkOrder/>}/>
        <Route path="/BulkOrder/:productId" element={<BulkOrder/>}/>
        <Route path="/CustomizeOrder" element={<CustomizeOrder />} />
        <Route path="/myCustomeorders" element={<MyCustomOrders/>}/>
        <Route path="/payment/:orderId" element={<Payment/>} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route element={<AdminLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/AdminProduct" element={<AdminProduct />} />
        <Route path="/AdminCategory" element={<AdminCategory/>}/>
        <Route path="/UserMang" element={<UserMang />} />
        <Route path="/Adminorder" element={<Adminorder />} />
        <Route path="/AdminCustomization" element={<AdminCustomization />}/>
        <Route path="/AdminReport" element={<AdminReport />} />
        <Route path="/AdminReview" element={<AdminReview/>}/>
        <Route path="/AdminBulkOrder" element={<AdminBulkOrder/>}/>
        <Route path="/AdminInventory" element={<AdminInventory/>}/>
      </Route>

    </Routes>
  );
}