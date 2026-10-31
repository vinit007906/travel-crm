import mongoose from "mongoose";

export const LEAD_STATUSES = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"];

const activitySchema = new mongoose.Schema({
  type: { type: String, enum: ["Call", "Email", "Meeting", "Note", "Other"], default: "Note" },
  note: { type: String, required: true, trim: true, maxlength: 2000 },
  followUpDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  phoneNormalized: { type: String, required: true, index: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  emailNormalized: { type: String, default: "", index: true },
  destination: { type: String, required: true, trim: true, maxlength: 120 },
  budget: { type: Number, min: 0, default: 0 },
  travelDate: { type: Date, default: null },
  assignedTo: { type: String, default: "Unassigned" },
  status: { type: String, enum: LEAD_STATUSES, default: "New" },
  notes: { type: String, trim: true, default: "", maxlength: 3000 },
  whatsappOptIn: {
  type: Boolean,
  default: false
},
whatsappOptInAt: {
  type: Date,
  default: null
},
whatsappOptInSource: {
  type: String,
  default: ""
},
  activities: { type: [activitySchema], default: [] },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null }
}, { timestamps: true });

export default mongoose.model("Lead", leadSchema);
