import mongoose from "mongoose";
import { Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

interface AuthLocals {
  user: { userId: string; role: string };
}

// 100 用戶登錄
export const loginUser: RequestHandler = async (req, res, next) => {
  try {
    const { account, password } = req.body;
    const user = await User.findOne({ account });

    if (!user) {
      res.status(401).json({ message: "帳號不存在" });
      return;
    }

    if (user.isLocked) {
      res.status(403).json({ message: "帳號已鎖定，請聯絡管理員" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginFailCount += 1;

      if (user.loginFailCount >= 3) {
        user.isLocked = true;
      }

      await user.save();
      res.status(401).json({ message: "密碼錯誤" });
      return;
    }

    // 登入成功
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
export const getAllUsers: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// 102 取得目前登入者資訊 (admin 與 staff 皆可)
export const getCurrentUser: RequestHandler = (req: AuthRequest, res, next) => {
  if (!req.user) {
    res.status(401).json({ message: "未授權存取" });
    return;
  }

  res.json({
    userId: req.user.userId,
    role: req.user.role,
  });
};

// 104新增 staff 帳號
export const createUser = async (req: Request, res: Response) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return res.status(400).json({ message: "請提供帳號與密碼" });
  }

  try {
    // 檢查是否已存在
    const existingUser = await User.findOne({ account });
    if (existingUser) {
      return res.status(409).json({ message: "此帳號已存在" });
    }

    // 密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 建立帳號（role預設為 staff）
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
    console.error(err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 105 解鎖員工帳號
export const unlockUser = async (req: Request, res: Response) => {
  const userId = req.params.id;

  // 檢查 ObjectId 格式
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "無效的使用者 ID 格式" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "使用者不存在" });
    }

    user.isLocked = false;
    user.loginFailCount = 0;
    await user.save();

    res.json({ message: "帳號已成功解鎖" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 106 更新 staff 資訊 (帳號、密碼)
export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { account, password } = req.body;

  // 檢查 ID 格式
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "無效的使用者 ID 格式" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "使用者不存在" });

    // 驗證 account（如有傳入）
    if (account !== undefined) {
      if (typeof account !== "string" || account.trim() === "") {
        return res.status(400).json({ message: "帳號不得為空" });
      }
      user.account = account.trim();
    }

    // 驗證 password（如有傳入）
    if (password !== undefined) {
      if (typeof password !== "string" || password.trim() === "") {
        return res.status(400).json({ message: "密碼不得為空" });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "使用者資訊已更新" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
};

// 107 刪除 staff 帳號
export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;

  // 檢查 ID 格式是否為有效 ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "無效的使用者 ID 格式" });
  }
  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "找不到該使用者" });
    }

    res.json({ message: "使用者已成功刪除" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
};
