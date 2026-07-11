const Contact = require("../modules/contactSchema");
const mongoose = require("mongoose");

// ➤ Add Contact
const addContact = async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const newContact = new Contact({
      fullName,
      email,
      subject,
      message
    });

    await newContact.save();

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newContact
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

module.exports = { addContact };