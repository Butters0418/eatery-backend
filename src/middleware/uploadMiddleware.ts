import multer from "multer";

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

export default upload;
