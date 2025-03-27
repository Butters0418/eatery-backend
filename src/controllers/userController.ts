import mongoose from "mongoose";
import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import { loginSchema, createUserSchema, updateUserSchema, verifyCodeSchema, resetPasswordSchema } from "../validations/userValidation";
import { sendVerificationCode } from "../utils/mailer";

// 100 用戶登錄
export const loginUser: RequestHandler = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { account, password } = req.body;
    const user = await User.findOne({ account });

    if (!user) {
      res.status(401).json({ message: "帳號不存在" });
      return;
    }

    if (user.isLocked) {
      const lockedMessage = user.role === "admin" ? "帳號已鎖定，驗證碼已寄到您的信箱" : "帳號已鎖定，請聯絡管理員";
      res.status(403).json({ message: lockedMessage });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginFailCount += 1;

      if (user.loginFailCount >= 3) {
        user.isLocked = true;

        if (user.role === "admin") {
          const code = crypto.randomInt(100000, 999999).toString();
          user.verificationCode = code;
          user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

          await sendVerificationCode(user.account, code);
        }
      }

      await user.save();

      if (user.isLocked) {
        const lockedMessage = user.role === "admin" ? "帳號已鎖定，驗證碼已寄到您的信箱" : "帳號已鎖定，請聯絡管理員";
        res.status(403).json({ message: lockedMessage });
        return;
      }

      res.status(401).json({ message: "密碼錯誤" });
      return;
    }

    // 成功登入
    user.loginFailCount = 0;
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "1d" });

    res.json({
      message: "登入成功",
      token,
      user: {
        account: user.account,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 103 取得所有使用者資訊（限 admin）
export const getAllUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// 102 取得目前登入者資訊 (admin 與 staff 皆可)
export const getCurrentUser: RequestHandler = (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: "未授權存取" });
    return;
  }

  res.json({
    userId: req.user.userId,
    role: req.user.role,
  });
};

// 104 新增 staff 帳號
export const createUser: RequestHandler = async (req, res) => {
  const { error } = createUserSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { account, password } = req.body;

  try {
    const existingUser = await User.findOne({ account });
    if (existingUser) {
      res.status(409).json({ message: "此帳號已存在" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      account,
      password: hashedPassword,
      role: "staff",
      loginFailCount: 0,
      isLocked: false,
    });

    await newUser.save();
    res.status(201).json({ message: "新增員工帳號成功" });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 105 解鎖員工帳號
export const unlockUser: RequestHandler = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: "無效的使用者 ID 格式" });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "使用者不存在" });
      return;
    }

    user.isLocked = false;
    user.loginFailCount = 0;
    await user.save();

    res.json({ message: "帳號已成功解鎖" });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 106 更新 staff 資訊 (帳號、密碼)
export const updateUser: RequestHandler = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: "無效的使用者 ID 格式" });
    return;
  }

  const { error } = updateUserSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { account, password } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "使用者不存在" });
      return;
    }

    if (account) user.account = account.trim();
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ message: "使用者資訊已更新" });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 107 刪除 staff 帳號
export const deleteUser: RequestHandler = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ message: "無效的使用者 ID 格式" });
    return;
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      res.status(404).json({ message: "找不到該使用者" });
      return;
    }

    res.json({ message: "使用者已成功刪除" });
  } catch (err) {
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 108 驗證 admin 驗證碼
export const verifyResetCode: RequestHandler = async (req, res, next) => {
  try {
    const { error } = verifyCodeSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { account, code } = req.body;

    const user = await User.findOne({ account, role: "admin" });
    if (!user || user.verificationCode !== code) {
      res.status(400).json({ message: "驗證碼錯誤" });
      return;
    }

    if (!user.verificationExpires || user.verificationExpires < new Date()) {
      res.status(400).json({ message: "驗證碼已過期" });
      return;
    }

    // 驗證成功，解鎖帳號並清除驗證碼
    user.isLocked = false;
    user.loginFailCount = 0;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    res.json({ message: "驗證成功，請重新登入" });
  } catch (err) {
    next(err);
  }
};

// 109 重寄驗証碼
export const resendVerificationCode: RequestHandler = async (req, res, next) => {
  try {
    const { account } = req.body;
    const user = await User.findOne({ account, role: "admin" });

    if (!user || !user.isLocked) {
      res.status(400).json({ message: "帳號未鎖定或不存在" });
      return;
    }

    const code = crypto.randomInt(100000, 999999).toString();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationCode(user.account, code);
    res.json({ message: "驗證碼已重新寄出，請查收信箱" });
  } catch (err) {
    next(err);
  }
};

// 110 重設密碼
export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { account, newPassword } = req.body;

    const user = await User.findOne({ account, role: "admin" });
    if (!user) {
      res.status(404).json({ message: "使用者不存在" });
      return;
    }

    if (user.verificationCode || user.isLocked) {
      res.status(403).json({ message: "請先通過驗證碼驗證" });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "密碼重設成功，請重新登入" });
  } catch (err) {
    next(err);
  }
};
