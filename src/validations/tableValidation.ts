import Joi from "joi";

export const createTableSchema = Joi.object({
  tableNumber: Joi.number().required().messages({
    "any.required": "請輸入桌號",
    "number.base": "桌號必須是數字",
  }),
});

export const updateTableSchema = Joi.object({
  tableNumber: Joi.number().integer().min(1),
});
