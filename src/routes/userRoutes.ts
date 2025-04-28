import express, { Router } from "express";
import { loginUser, getAllUsers, getCurrentUser, createUser, unlockUser, updateUser, deleteUser, verifyResetCode, resendVerificationCode, resetPassword } from "../controllers/userController";
import { verifyToken, checkAdmin } from "../middleware/authMiddleware";

const router: Router = express.Router();

router.post("/login", loginUser); // 登入：不需驗證
router.get("/me", verifyToken, getCurrentUser); // 取得目前登入者資訊：需要登入
router.get("/users", verifyToken, checkAdmin, getAllUsers); // 取得所有使用者（只有 admin 可用）
router.post("/users", verifyToken, checkAdmin, createUser); // 新增 staff 帳號 （只有 admin 可用）
router.patch("/users/:id/unlock", verifyToken, checkAdmin, unlockUser); // 解鎖員工帳號 （只有 admin 可用）
router.patch("/users/:id", verifyToken, checkAdmin, updateUser); // 更新 staff 資訊 (帳號、密碼) （只有 admin 可用）
router.delete("/users/:id", verifyToken, checkAdmin, deleteUser); // 刪除 staff 帳號 （只有 admin 可用）
router.post("/verify-reset-code", verifyResetCode); // 驗證 admin 驗證碼
router.post("/resend-verification-code", resendVerificationCode); // 重寄驗證碼
router.post("/reset-password", resetPassword); // 重設密碼

export default router;
