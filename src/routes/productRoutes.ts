import express from "express";
import { getAllProducts, getProductById } from "../controllers/productController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);

export default router;
