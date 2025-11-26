import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { setupWebSocket } from "./services/websocketService";

import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import tableRoutes from "./routes/tableRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();
const server = http.createServer(app); // 🔥 改成 http server

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use("/api", userRoutes);
app.use("/api", productRoutes);
app.use("/api", tableRoutes);
app.use("/api", uploadRoutes);
app.use("/api", orderRoutes);

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ✅ 啟動 WebSocket Server
setupWebSocket(server);

// ✅ 啟動 HTTP + WebSocket
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
