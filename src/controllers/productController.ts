import mongoose from "mongoose";
import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Product from "../models/Product";

// 200 - 取得所有商品
export const getAllProducts: RequestHandler = async (_req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// 201 取得單一商品詳細資料
export const getProductById: RequestHandler = async (req, res, next) => {
  const productId = req.params.id;

  // 檢查是否為有效的 ObjectId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "無效的商品 ID" });
    return;
  }

  try {
    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({ message: "找不到該商品" });
      return;
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};
