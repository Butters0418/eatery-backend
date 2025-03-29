import Joi from "joi";

export const createTableSchema = Joi.object({
  tableNumber: Joi.number().required().messages({
    "any.required": "請輸入桌號",
    "number.base": "桌號必須是數字",
  }),
  qrImage: Joi.string().uri().required().messages({
    "any.required": "請提供 QR Code 圖片連結",
    "string.uri": "QR 圖片連結格式錯誤",
  }),
});

export const updateTableSchema = Joi.object({
  tableNumber: Joi.number().integer().min(1),
  qrImage: Joi.string().uri().allow(""),
});
