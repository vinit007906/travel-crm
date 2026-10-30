import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json(users);

  } catch (error) {
    console.error("Users fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
});

export default router;