import express from "express";
import { getAllOrders, getOrderById, createOrder, updateOrderItem, deleteOrderItem, softDeleteOrder, markItemAsServed, markOrderAsPaid, completeOrder } from "../controllers/orderController";
import { verifyToken, verifyTokenOptional } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/orders", verifyToken, getAllOrders);
router.get("/orders/:id", verifyToken, getOrderById);
router.post("/orders", verifyTokenOptional, createOrder);
router.patch("/orders/:id/item/:itemCode", verifyToken, updateOrderItem);
router.patch("/orders/:id/item/:itemCode/delete", verifyToken, deleteOrderItem);
router.patch("/orders/:id/delete", verifyToken, softDeleteOrder);
router.patch("/orders/:id/item/:itemCode/served", verifyToken, markItemAsServed);
router.patch("/orders/:id/paid", verifyToken, markOrderAsPaid);
router.patch("/orders/:id/complete", verifyToken, completeOrder);

export default router;
