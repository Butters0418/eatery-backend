import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// 擴充 Request 讓後續可以存取 req.user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: "admin" | "staff";
  };
}

//  驗證是否有帶合法 JWT
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "未提供有效的授權 token" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: "admin" | "staff";
    };

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "token 無效或已過期" });
    return;
  }
};

// 檢查是否為 admin（專屬功能使用）
export const checkAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "只有管理者可以使用此功能" });
    return;
  }
  next();
};
