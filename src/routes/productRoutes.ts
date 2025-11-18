import express from "express";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, updateProductPopular, updateProductAvailable } from "../controllers/productController";
import { verifyToken, verifyTokenOptional, checkAdmin } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const router = express.Router();

router.get("/products", verifyTokenOptional, getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", verifyToken, checkAdmin, createProduct);
router.put("/products/:id", verifyToken, checkAdmin, updateProduct);
router.delete("/products/:id", verifyToken, checkAdmin, deleteProduct);
router.patch("/products/:id/popular", verifyToken, checkAdmin, updateProductPopular);
router.patch("/products/:id/available", verifyToken, checkAdmin, updateProductAvailable);
export default router;
