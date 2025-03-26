import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account, password } = req.body;
    const user = await User.findOne({ account });

    if (!user) {
      return res.status(401).json({ message: "帳號不存在" });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: "帳號已鎖定，請聯絡管理員" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginFailCount += 1;

      if (user.loginFailCount >= 3) {
        user.isLocked = true;
      }

      await user.save();
      return res.status(401).json({ message: "密碼錯誤" });
    }

    // 登入成功
    user.loginFailCount = 0;
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "1d" });

    return res.json({
      message: "登入成功",
      token,
      user: {
        account: user.account,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
