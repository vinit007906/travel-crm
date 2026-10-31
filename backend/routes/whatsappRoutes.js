import express from "express";
import { sendWhatsAppTemplate } from "../services/interaktService.js";

const router = express.Router();

// Test WhatsApp template message
router.post("/test", async (req, res) => {
  try {
    const { phoneNumber, customerName } = req.body;

    if (!phoneNumber || !customerName) {
      return res.status(400).json({
        message: "Phone number and customer name are required"
      });
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        message: "Enter a valid 10-digit Indian mobile number"
      });
    }

    if (!process.env.INTERAKT_API_KEY) {
      return res.status(500).json({
        message: "Interakt API key is missing"
      });
    }

    const result = await sendWhatsAppTemplate({
      phoneNumber,
      templateName: process.env.INTERAKT_TEMPLATE_NAME,
      languageCode: "en",
      bodyValues: [customerName]
    });

    res.status(200).json({
      message: "WhatsApp API request completed",
      result
    });

  } catch (error) {
    console.error("WhatsApp test error:", error.response?.data || error.message);

    res.status(500).json({
      message: "WhatsApp message could not be sent",
      error: error.response?.data || error.message
    });
  }
});

export default router;