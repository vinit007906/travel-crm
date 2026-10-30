import { Router } from "express";
import Lead from "../models/Lead.js";
import Booking from "../models/Booking.js";

const router = Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const [totalLeads, newLeads, contactedLeads, interestedLeads, followUpLeads, convertedLeads, lostLeads, bookings, pendingFollowUps] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: "New" }),
      Lead.countDocuments({ status: "Contacted" }),
      Lead.countDocuments({ status: "Interested" }),
      Lead.countDocuments({ status: "Follow-up" }),
      Lead.countDocuments({ status: "Converted" }),
      Lead.countDocuments({ status: "Lost" }),
      Booking.countDocuments(),
      Lead.countDocuments({ activities: { $elemMatch: { followUpDate: { $ne: null, $lte: new Date() } } }, status: { $nin: ["Converted", "Lost"] } })
    ]);
    const conversionRate = totalLeads ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;
    res.json({ totalLeads, newLeads, contactedLeads, interestedLeads, followUpLeads, convertedLeads, lostLeads, bookings, pendingFollowUps, conversionRate });
  } catch (err) { next(err); }
});

export default router;
