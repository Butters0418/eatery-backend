import { RequestHandler } from "express";
import Product from "../models/Product";

// 200 - 取得所有商品
export const getAllProducts: RequestHandler = async (_req, res, next) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    next(error);
  }
};
