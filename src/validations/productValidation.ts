import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "商品名稱為必填",
    "string.empty": "商品名稱不可為空",
  }),
  description: Joi.string().allow(""),
  price: Joi.number().min(0).required().messages({
    "any.required": "價格為必填",
    "number.base": "價格必須是數字",
    "number.min": "價格不能小於 0",
  }),
  isAvailable: Joi.boolean().required().messages({
    "any.required": "請指定商品是否上架",
  }),
  isPopular: Joi.boolean().default(false),
  imageUrl: Joi.string().uri().allow(""),
  category: Joi.string().required().messages({
    "any.required": "請選擇商品分類",
    "string.empty": "分類不可為空",
  }),
  addons: Joi.array()
    .items(
      Joi.object({
        group: Joi.string().required().messages({
          "any.required": "加料群組名稱為必填",
        }),
        options: Joi.array()
          .items(
            Joi.object({
              name: Joi.string().required().messages({
                "any.required": "加料名稱為必填",
              }),
              price: Joi.number().min(0).default(0).messages({
                "number.min": "加料價格不能小於 0",
              }),
            })
          )
          .min(1)
          .required()
          .messages({
            "array.min": "每個群組至少要有一個選項",
          }),
      })
    )
    .default([]),
});
