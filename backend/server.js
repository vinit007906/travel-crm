import userRoutes from "./routes/userRoutes.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:5177",
    "https://travel-crm-gamma.vercel.app"
  ],
  credentials: true
}));

// Middleware
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "travel-crm-api"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp", whatsappRoutes);
// Error handling
app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

// Server configuration
const port = process.env.PORT || 5001;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is missing. Check your .env file.");
  process.exit(1);
}

// Connect MongoDB and start server
mongoose.connect(uri)
  .then(() => {
    console.log("Connected to MongoDB successfully");

    app.listen(port, () => {
      console.log(`Travel CRM API running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:");
    console.error(error);
    process.exit(1);
  });
