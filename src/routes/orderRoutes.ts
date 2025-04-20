import express from "express";
import { getAllOrders, createOrder } from "../controllers/orderController";
import { verifyToken, verifyTokenOptional } from "../middleware/authMiddleware";

const router = express.Router();

// 取得訂單列表：需要員工/admin權限
router.get("/orders", verifyToken, getAllOrders);

// 建立訂單：根據訂單類型決定是否需要驗證
router.post("/orders", verifyTokenOptional, createOrder);

export default router;
