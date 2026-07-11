require("dotenv").config();
require("./database/connection");

const bcrypt = require("bcryptjs");
const Admin = require("./modules/adminSchema");

const createAdmin = async () => {
  try {
    // 1 Hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 2 Insert into database
    await Admin.create({
      email: "admin@gmail.com",
      password: hashedPassword
    });

    console.log(" Admin created successfully");
    process.exit();
  } catch (error) {
    console.log(" Error:", error.message);
    process.exit();
  }
};

createAdmin();