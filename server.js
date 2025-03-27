require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

console.log("SMTP Config:", process.env.SMTP_HOST, process.env.SMTP_USER);

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Connection Successful");
  }
});

app.post("/auth/callback", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    // ✅ Auth0 se user data le rahe hain
    const response = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = response.data;
    const userEmail = userData?.name;
    if (!userEmail) {
      return res
        .status(400)
        .json({ error: "User email not found in Auth0 response" });
    }

    // ✅ Send email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail, // 👈 Ensure yeh empty nahi hai
      subject: "Your Auth0 Token",
      text: `Here is your token: ${token}`,
    });

    res
      .status(200)
      .json({ message: "Token validated and email sent", user: userData });
  } catch (error) {
    console.error(
      "Token validation failed:",
      error.response?.data || error.message
    );
    res.status(401).json({ error: "Invalid token" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
