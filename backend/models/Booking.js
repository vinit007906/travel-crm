import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: "" },
  destination: { type: String, required: true },
  travelDate: { type: Date, default: null },
  budget: { type: Number, default: 0 },
  status: { type: String, enum: ["Pending", "Confirmed", "Cancelled"], default: "Pending" },
  bookingReference: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
