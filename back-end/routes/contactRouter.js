const express = require("express");
const router = express.Router();

const contactController = require("../controller/contactController");

// POST → Add Contact
router.post("/addContact", contactController.addContact);

module.exports = router;