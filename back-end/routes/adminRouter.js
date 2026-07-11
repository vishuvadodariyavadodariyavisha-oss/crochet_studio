const express = require('express');

const router = express.Router();

const adminController = require('../controller/adminController');
const adminAuth = require('../middleware/adminAuth');

router.post("/loginAdmin",async(req,res)=>{
        await adminController.loginAdmin(req,res);
});

router.get("/dashboard", adminAuth, (req, res) => {
   res.json({ message: "Welcome Admin" });
});

router.get("/users", adminAuth, async (req, res) => {
  await adminController.getUsers(req, res);
});

router.put(
  "/update-user-status/:id",
  adminAuth,async(req,res)=>{
  await adminController.updateUserStatus(req,res);
});

router.delete("/delete-user/:id", adminAuth, async (req,res) => {
  await adminController.deleteUser(req,res);
});

module.exports = router