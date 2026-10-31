
import express from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import {
  authenticateToken,
  requireCampaignRole
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all WhatsApp campaign routes
router.use(authenticateToken);
router.use(requireCampaignRole);

// Preview and validate a campaign without sending messages
router.post("/preview", async (req, res) => {
  try {
    const { leadIds, message } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        message: "Select at least one customer."
      });
    }

    if (leadIds.length > 100) {
      return res.status(400).json({
        message: "Maximum 100 customers per campaign."
      });
    }

    if (leadIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({
        message: "One or more customer IDs are invalid."
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Campaign message is required."
      });
    }

    const uniqueIds = [...new Set(leadIds)];

    const leads = await Lead.find({
      _id: { $in: uniqueIds }
    }).select("name phone destination whatsappOptIn");

    const eligible = leads.filter(
      lead => lead.whatsappOptIn === true
    );

    const rejectedCount = uniqueIds.length - eligible.length;

    res.json({
      message: "Campaign preview validated. No WhatsApp messages were sent.",
      selectedCount: uniqueIds.length,
      eligibleCount: eligible.length,
      rejectedCount,
      recipients: eligible.map(lead => ({
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        destination: lead.destination
      })),
      sendingEnabled: false
    });

  } catch (error) {
    console.error("Campaign preview error:", error);

    res.status(500).json({
      message: "Unable to prepare campaign preview."
    });
  }
});

export default router;
