import { Router } from "express";
import Booking from "../models/Booking.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).populate("lead", "name status").lean();
    res.json(bookings);
  } catch (err) { next(err); }
});

export default router;
