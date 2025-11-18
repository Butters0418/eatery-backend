import multer from "multer";
import { Request, Response, NextFunction } from "express";

// 限制 2MB
const MAX_SIZE = 2 * 1024 * 1024;

// 過濾檔案格式
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("只允許上傳圖片"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

// Multer 錯誤處理中介層
export const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "圖片大小不能超過 2MB" });
      return;
    }
    res.status(400).json({ message: `上傳錯誤: ${err.message}` });
    return;
  }

  if (err) {
    res.status(400).json({ message: err.message });
    return;
  }

  next();
};

export default upload;
