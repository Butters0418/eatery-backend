import express from "express";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, updateProductPopular, updateProductAvailable, uploadImage } from "../controllers/productController";
import { verifyToken, checkAdmin } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const router = express.Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", verifyToken, checkAdmin, createProduct);
router.patch("/products/:id", verifyToken, checkAdmin, updateProduct);
router.delete("/products/:id", verifyToken, checkAdmin, deleteProduct);
router.patch("/products/:id/popular", verifyToken, checkAdmin, updateProductPopular);
router.patch("/products/:id/available", verifyToken, checkAdmin, updateProductAvailable);
router.post("/upload/image", upload.single("image"), uploadImage);
export default router;
