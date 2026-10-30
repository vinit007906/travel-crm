import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

const demoUsers = [
  {
    name: "Admin",
    email: "admin@tripwise.demo",
    role: "Admin"
  },
  {
    name: "Manager",
    email: "manager@tripwise.demo",
    role: "Manager"
  },
  {
    name: "Agent",
    email: "agent@tripwise.demo",
    role: "Agent"
  }
];

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const user of demoUsers) {
      await User.updateOne(
        { email: user.email },
        { $set: user },
        { upsert: true }
      );
    }

    console.log("Demo users added successfully");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedUsers();