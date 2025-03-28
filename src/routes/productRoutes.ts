import express from "express";
import { getAllProducts, getProductById, createProduct } from "../controllers/productController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", verifyToken, createProduct);
export default router;
