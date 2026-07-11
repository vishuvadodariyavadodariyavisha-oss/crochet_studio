const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');
const userAuth = require('../middleware/userAuth');
const upload = require('../middleware/upload');

router.post("/registerUser", upload.single('profileImage'), userController.registerUser);

router.post("/loginUser", userController.loginUser);

router.get("/", userAuth, (req, res) => {
  res.json({ message: "Welcome User" });
});

router.get("/profile", userAuth, userController.getUserProfile);

router.put(
  "/update-profile",
  userAuth,
  upload.single("profileImage"),
  userController.updateUserProfile
);

router.put("/change-password", userAuth, userController.changePassword);

router.delete("/profile/permanent", userAuth, userController.deleteAccountPermanently);

router.get("/my-orders", userAuth, userController.getMyOrders);

module.exports = router;