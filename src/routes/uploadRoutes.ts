// src/routes/uploadRoutes.ts
import express from "express";
import { uploadImage } from "../controllers/uploadController";
import { verifyToken, checkAdmin } from "../middleware/authMiddleware";
import upload, { handleMulterError } from "../middleware/uploadMiddleware";

const router = express.Router();

router.post("/upload/image", verifyToken, checkAdmin, upload.single("image"), handleMulterError, uploadImage);

export default router;
