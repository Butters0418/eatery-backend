import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import tableRoutes from "./routes/tableRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB 連線
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ✅ 掛載所有 /api 路由
app.use("/api", userRoutes);
app.use("/api", productRoutes);
app.use("/api", tableRoutes);
app.use("/api", uploadRoutes);
app.use("/api", orderRoutes);

// 測試根路由
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
