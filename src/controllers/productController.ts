import mongoose from "mongoose";
import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Product from "../models/Product";
import { createProductSchema, updateProductSchema } from "../validations/productValidation";

// 200 - 取得所有商品
export const getAllProducts: RequestHandler = async (_req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// 201 - 取得單一商品詳細資料
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

// 202 - 新增商品（僅限 admin）
export const createProduct: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "只有管理員可以新增商品" });
      return;
    }

    const { error } = createProductSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const newProduct = new Product(req.body);
    await newProduct.save();

    res.status(201).json({ message: "商品新增成功", product: newProduct });
  } catch (err) {
    next(err);
  }
};

// 203 - 更新商品（僅限 admin）
export const updateProduct: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const productId = req.params.id;

    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "只有管理員可以修改商品" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: "無效的商品 ID" });
      return;
    }

    const { error } = updateProductSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const updated = await Product.findByIdAndUpdate(productId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ message: "找不到該商品" });
      return;
    }

    res.json({ message: "商品已更新", product: updated });
  } catch (err) {
    next(err);
  }
};

// 204 - 刪除商品（僅 admin）
export const deleteProduct: RequestHandler = async (req: AuthRequest, res, next) => {
  const productId = req.params.id;

  try {
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "只有管理員可以刪除商品" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: "無效的商品 ID" });
      return;
    }

    const deleted = await Product.findByIdAndDelete(productId);

    if (!deleted) {
      res.status(404).json({ message: "找不到該商品" });
      return;
    }

    res.json({ message: "商品已成功刪除" });
  } catch (err) {
    next(err);
  }
};

// 205 - 更新商品熱門狀態（僅限 admin）
export const updateProductPopular: RequestHandler = async (req: AuthRequest, res, next) => {
  const productId = req.params.id;
  const { isPopular } = req.body;

  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "只有管理員可以修改熱門狀態" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "無效的商品 ID" });
    return;
  }

  try {
    const updated = await Product.findByIdAndUpdate(productId, { isPopular }, { new: true, runValidators: true });

    if (!updated) {
      res.status(404).json({ message: "找不到該商品" });
      return;
    }

    res.json({ message: "商品熱門狀態已更新", product: updated });
  } catch (err) {
    next(err);
  }
};

// 206 - 更新商品上架狀態（僅限 admin）
export const updateProductAvailable: RequestHandler = async (req: AuthRequest, res, next) => {
  const productId = req.params.id;
  const { isAvailable } = req.body;

  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "只有管理員可以修改上架狀態" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "無效的商品 ID" });
    return;
  }

  try {
    const updated = await Product.findByIdAndUpdate(productId, { isAvailable }, { new: true, runValidators: true });

    if (!updated) {
      res.status(404).json({ message: "找不到該商品" });
      return;
    }

    res.json({ message: "商品上架狀態已更新", product: updated });
  } catch (err) {
    next(err);
  }
};
