import express, { Router, RequestHandler } from "express";
import { loginUser, getAllUsers, getCurrentUser, createUser, unlockUser, updateUser, deleteUser, verifyResetCode, resendVerificationCode, resetPassword } from "../controllers/userController";
import { verifyToken, checkAdmin } from "../middleware/authMiddleware";

const router: Router = express.Router();

// 登入：不需驗證
router.post("/login", loginUser);

// 取得目前登入者資訊：需要登入
router.get("/me", verifyToken, getCurrentUser);

// 取得所有使用者（只有 admin 可用）
router.get("/users", verifyToken, checkAdmin, getAllUsers);

// 新增 staff 帳號 （只有 admin 可用）
router.post("/users", verifyToken, checkAdmin, createUser as RequestHandler);

// 解鎖員工帳號 （只有 admin 可用）
router.patch("/users/:id/unlock", verifyToken, checkAdmin, unlockUser as RequestHandler);

// 更新 staff 資訊 (帳號、密碼) （只有 admin 可用）
router.patch("/users/:id", verifyToken, checkAdmin, updateUser as RequestHandler);

// 刪除 staff 帳號 （只有 admin 可用）
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser as RequestHandler);

// 驗證 admin 驗證碼
router.post("/verify-reset-code", verifyResetCode as RequestHandler);

// 重寄驗證碼
router.post("/resend-verification-code", resendVerificationCode as RequestHandler);

// 重設密碼
router.post("/reset-password", resetPassword as RequestHandler);

export default router;
