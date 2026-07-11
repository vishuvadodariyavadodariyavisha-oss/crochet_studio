import React, { useState } from "react";
import "../styless/contact.css";
import axios from "axios";

export default function Contact() {

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/contact/addContact",
        formData
      );

      alert(res.data.message || "Message sent successfully!");

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        subject: "",
        message: ""
      });

    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message || "Server error. Try again."
      );
    }
  };

  return (
    <div className="contact-wrapper">
      <div className="contact-glass">

        <div className="contact-info">
          <h2>Get In Touch</h2>
          <p>
            Have questions about our handcrafted collection?
            We'd love to help you.
          </p>

          <div className="info-item">
            <span>📍</span>
            <p>Surat, Gujarat, India</p>
          </div>

          <div className="info-item">
            <span>📞</span>
            <p>+91 98765 43210</p>
          </div>

          <div className="info-item">
            <span>📧</span>
            <p>support@crochetstore.com</p>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          
          <div className="input-group">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <label>Full Name</label>
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label>Email Address</label>
          </div>

          <div className="input-group">
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
            <label>Subject</label>
          </div>

          <div className="input-group">
            <textarea
              name="message"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <label>Message</label>
          </div>

          <button type="submit" className="send-btn">
            Send Message
          </button>

        </form>

      </div>
    </div>
  );
}