import express from "express";
import { createTable, getAllTables, getTableById, updateTable, deleteTable, resetTable, getQrTokenByTableCode } from "../controllers/tableController";
import { verifyToken, checkAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/tables", verifyToken, getAllTables);
router.get("/tables/:id", verifyToken, getTableById);
router.post("/tables", verifyToken, checkAdmin, createTable);
router.patch("/tables/:id", verifyToken, checkAdmin, updateTable);
router.delete("/tables/:id", verifyToken, checkAdmin, deleteTable);
router.patch("/tables/:id/reset", verifyToken, resetTable);
router.get("/table/qr-token", getQrTokenByTableCode);
export default router;
