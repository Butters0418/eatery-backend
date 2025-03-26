import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const existing = await User.findOne({ account: "butters.test.demo@gmail.com" });
    if (existing) {
      console.log("⚠️ Admin 帳號已存在，略過建立");
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("@test1111", 10);

    const admin = new User({
      account: "butters.test.demo@gmail.com",
      password: hashedPassword,
      role: "admin",
      isLocked: false,
      loginFailCount: 0,
    });

    await admin.save();
    console.log("✅ Admin 帳號建立成功");

    process.exit(0);
  } catch (err) {
    console.error("❌ 建立失敗:", err);
    process.exit(1);
  }
}

createAdmin();
