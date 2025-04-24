import Joi from "joi";
import mongoose from "mongoose";
import Product from "../models/Product";

// 自訂-檢查商品是否存在
const validateProductExistence = async (value: any, helpers: any) => {
  const product = await Product.findById(value.productId);
  if (!product) {
    throw new Error(`商品 ${value.name || ""} 不存在`);
  }
  if (!product.isAvailable) {
    throw new Error(`商品 ${product.name} 目前未上架`);
  }
  return value;
};

// 單一 addons 選項
const addonOptionSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "addons 名稱不能為空",
    "any.required": "addons 名稱為必填",
  }),
  price: Joi.number().min(0).required().messages({
    "number.base": "addons 價格需為數字",
    "any.required": "addons 價格為必填",
  }),
  selected: Joi.boolean().required().messages({
    "boolean.base": "addons 選擇需為布林值",
    "any.required": "addons 選擇為必填",
  }),
});

// addons 群組
const addonSchema = Joi.object({
  group: Joi.string().required().messages({
    "string.empty": "addons 群組不能為空",
    "any.required": "addons 群組為必填",
  }),
  options: Joi.array().items(addonOptionSchema).min(1).required().messages({
    "array.min": "請至少選擇一個 addons 選項",
    "any.required": "addons 選項為必填",
  }),
});

// 單一商品
const itemSchema = Joi.object({
  productId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid", { message: "無效的商品 ID" });
      }
      return value;
    }),
  name: Joi.string().required().messages({
    "string.empty": "商品名稱不能為空",
    "any.required": "商品名稱為必填",
  }),
  price: Joi.number().min(0).required().messages({
    "number.base": "商品價格需為數字",
    "any.required": "商品價格為必填",
  }),
  qty: Joi.number().min(1).required().messages({
    "number.min": "商品數量至少為 1",
    "any.required": "商品數量為必填",
  }),
  addons: Joi.array().items(addonSchema).required(),
}).external(validateProductExistence);

// 單一訂單項目（可能是加點）
const orderEntrySchema = Joi.object({
  item: Joi.array().items(itemSchema).min(1).required(),
});

// 建立訂單 schema
export const createOrderSchema = Joi.object({
  orderType: Joi.string().valid("內用", "外帶").required(),

  tableId: Joi.when("orderType", {
    is: "內用",
    then: Joi.string()
      .required()
      .custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return helpers.error("any.invalid", { message: "無效的桌號 ID" });
        }
        return value;
      }),
    otherwise: Joi.forbidden(),
  }),

  tableToken: Joi.when("orderType", {
    is: "內用",
    then: Joi.string().required().messages({
      "any.required": "缺少桌號驗證 token",
    }),
    otherwise: Joi.forbidden(),
  }),

  orderList: Joi.array().items(orderEntrySchema).min(1).required(),
});

// 編輯訂單 schema
export const updateOrderItemSchema = Joi.object({
  item: Joi.array().items(itemSchema).min(1).required(),
});
