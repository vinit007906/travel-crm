
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT configuration is missing."
      });
    }

    // Find user in MongoDB
    const foundUser = await User.findOne({
      email: String(email).trim().toLowerCase()
    });

    if (!foundUser) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Verify hashed password
    const passwordValid = await bcrypt.compare(
      password,
      foundUser.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = {
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role
    };

    // Generate JWT
    const token = jwt.sign(
      {
        id: foundUser._id.toString(),
        email: foundUser.email,
        role: foundUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ token, user });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

export default router;
