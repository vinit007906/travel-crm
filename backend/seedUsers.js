
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const demoUsers = [
  {
    name: "Admin",
    email: "admin@tripwise.demo",
    password: "demo123",
    role: "Admin"
  },
  {
    name: "Manager",
    email: "manager@tripwise.demo",
    password: "demo123",
    role: "Manager"
  },
  {
    name: "Agent",
    email: "agent@tripwise.demo",
    password: "demo123",
    role: "Agent"
  }
];

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);

      await User.updateOne(
        { email: user.email },
        {
          $set: {
            name: user.name,
            email: user.email,
            passwordHash,
            role: user.role
          }
        },
        { upsert: true }
      );
    }

    console.log("Users created with hashed passwords successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedUsers();
