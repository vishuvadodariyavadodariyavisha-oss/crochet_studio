const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads/";

    if (req.originalUrl.includes("/category")) {
      folder += "categories/";
    } else if (req.originalUrl.includes("/product")) {
      folder += "products/";
    } else if (req.originalUrl.includes("/user") || req.originalUrl.includes("/registerUser")) {
      folder += "users/";
    } else {
      folder += "others/";
    }

    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },

  filename: function (req, file, cb) {
    let baseName = "file";

    // Dynamic naming based on categoryName, productName, or userName
    if (req.body.categoryName) {
      baseName = req.body.categoryName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    } else if (req.body.productName) {
      baseName = req.body.productName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    } else if (req.body.name) { // User માટે 'name' કી
      baseName = req.body.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    }

    const finalName = `${baseName}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, finalName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpg|jpeg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only JPG, JPEG, PNG and WEBP allowed"));
  },
});

module.exports = upload;