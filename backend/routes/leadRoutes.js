import { Router } from "express";
import mongoose from "mongoose";
import Lead, { LEAD_STATUSES } from "../models/Lead.js";
import Booking from "../models/Booking.js";

const router = Router();
const team = ["Unassigned", "Priya Sharma", "Rahul Patil", "Amit Deshmukh", "Neha Joshi"];
const cleanPhone = (value = "") => value.replace(/\D/g, "");
const cleanEmail = (value = "") => value.trim().toLowerCase();

function validateLead(body, partial = false) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!String(body.name || "").trim()) errors.push("Customer name is required.");
  }
  if (!partial || body.phone !== undefined) {
    if (!cleanPhone(body.phone).length) errors.push("Phone number is required.");
  }
  if (!partial || body.destination !== undefined) {
    if (!String(body.destination || "").trim()) errors.push("Destination is required.");
  }
  if (body.status !== undefined && !LEAD_STATUSES.includes(body.status)) errors.push("Invalid lead status.");
  if (body.assignedTo !== undefined && !team.includes(body.assignedTo)) errors.push("Choose a valid team member.");
  if (body.budget !== undefined && (Number.isNaN(Number(body.budget)) || Number(body.budget) < 0)) errors.push("Budget must be zero or more.");
  return errors;
}

router.get("/", async (req, res, next) => {
  try {
    const { search = "", status = "", assignedTo = "" } = req.query;
    const filter = {};
    if (status && LEAD_STATUSES.includes(status)) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { destination: { $regex: safe, $options: "i" } }
      ];
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    res.json(leads);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const errors = validateLead(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(" ") });
    const phoneNormalized = cleanPhone(req.body.phone);
    const emailNormalized = cleanEmail(req.body.email);
    const duplicateOr = [{ phoneNormalized }];
    if (emailNormalized) duplicateOr.push({ emailNormalized });
    const duplicates = await Lead.find({ $or: duplicateOr }).select("name phone email destination status").limit(5).lean();
    if (duplicates.length) {
      return res.status(409).json({
        message: "A possible duplicate lead already exists. Review the matching record before creating another.",
        duplicates
      });
    }
    const lead = await Lead.create({
      name: req.body.name.trim(),
      phone: req.body.phone.trim(),
      phoneNormalized,
      email: req.body.email ? req.body.email.trim().toLowerCase() : "",
      emailNormalized,
      destination: req.body.destination.trim(),
      budget: Number(req.body.budget || 0),
      travelDate: req.body.travelDate || null,
      assignedTo: req.body.assignedTo || "Unassigned",
      status: req.body.status || "New",
      notes: req.body.notes || ""
    });
    res.status(201).json(lead);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lead ID." });
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    res.json(lead);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lead ID." });
    const errors = validateLead(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors.join(" ") });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    if (lead.status === "Converted") return res.status(400).json({ message: "Converted leads cannot be edited in this prototype." });

    const allowed = ["name", "phone", "email", "destination", "budget", "travelDate", "assignedTo", "status", "notes"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "email") lead.email = String(req.body.email).trim().toLowerCase();
        else if (key === "budget") lead.budget = Number(req.body.budget || 0);
        else lead[key] = req.body[key];
      }
    }
    lead.phoneNormalized = cleanPhone(lead.phone);
    lead.emailNormalized = cleanEmail(lead.email);
    const duplicateOr = [{ phoneNormalized: lead.phoneNormalized }];
    if (lead.emailNormalized) duplicateOr.push({ emailNormalized: lead.emailNormalized });
    const duplicate = await Lead.findOne({ _id: { $ne: lead._id }, $or: duplicateOr }).select("_id");
    if (duplicate) return res.status(409).json({ message: "Another lead already uses this phone number or email." });
    await lead.save();
    res.json(lead);
  } catch (err) { next(err); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lead ID." });
    if (!LEAD_STATUSES.includes(req.body.status)) return res.status(400).json({ message: "Invalid lead status." });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    if (lead.status === "Converted") return res.status(400).json({ message: "Converted leads cannot change status." });
    lead.status = req.body.status;
    await lead.save();
    res.json(lead);
  } catch (err) { next(err); }
});

router.post("/:id/activities", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lead ID." });
    if (!String(req.body.note || "").trim()) return res.status(400).json({ message: "Activity note is required." });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found." });
    if (lead.status === "Converted") return res.status(400).json({ message: "Cannot add activities to a converted lead in this prototype." });
    lead.activities.push({
      type: req.body.type || "Note",
      note: String(req.body.note).trim(),
      followUpDate: req.body.followUpDate || null
    });
    if (req.body.followUpDate && lead.status !== "Lost") lead.status = "Follow-up";
    await lead.save();
    res.status(201).json(lead);
  } catch (err) { next(err); }
});

router.post("/:id/convert", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid lead ID." });
    const session = await mongoose.startSession();
    let createdBooking;
    try {
      await session.withTransaction(async () => {
        const lead = await Lead.findById(req.params.id).session(session);
        if (!lead) {
          const error = new Error("Lead not found."); error.status = 404; throw error;
        }
        if (lead.status === "Converted" || lead.bookingId) {
          const error = new Error("This lead has already been converted."); error.status = 409; throw error;
        }
        if (lead.status === "Lost") {
          const error = new Error("A Lost lead cannot be converted. Update its status first."); error.status = 400; throw error;
        }
        const bookingReference = `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const [booking] = await Booking.create([{
          lead: lead._id,
          customerName: lead.name,
          phone: lead.phone,
          email: lead.email,
          destination: lead.destination,
          travelDate: lead.travelDate,
          budget: lead.budget,
          bookingReference
        }], { session });
        lead.status = "Converted";
        lead.bookingId = booking._id;
        await lead.save({ session });
        createdBooking = booking;
      });
      res.status(201).json(createdBooking);
    } finally { await session.endSession(); }
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A booking already exists for this lead." });
    next(err);
  }
});

export default router;
