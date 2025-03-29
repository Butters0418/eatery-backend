import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { bucket } from "../config/firebase";

// 207 上傳圖片
export const uploadImage: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "請選擇圖片上傳" });
      return;
    }

    const folder = req.body.type || "uploads"; // 預設為 uploads
    const blob = bucket.file(`${folder}/${Date.now()}-${req.file.originalname}`);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      console.error(err);
      res.status(500).json({ message: "圖片上傳失敗" });
    });

    blobStream.on("finish", async () => {
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).json({ imageUrl: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
};
