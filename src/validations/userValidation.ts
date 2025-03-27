import Joi from "joi";

// 登入驗證
export const loginSchema = Joi.object({
  account: Joi.string().min(3).required().messages({
    "string.base": "帳號必須是文字",
    "string.empty": "帳號不能為空",
    "string.min": "帳號至少需 3 個字元",
    "any.required": "帳號為必填",
  }),
  password: Joi.string().min(6).required().messages({
    "string.base": "密碼必須是文字",
    "string.empty": "密碼不能為空",
    "string.min": "密碼至少需 6 個字元",
    "any.required": "密碼為必填",
  }),
});

// 新增員工帳號驗證
export const createUserSchema = Joi.object({
  account: Joi.string().min(3).required().messages({
    "string.base": "帳號必須是文字",
    "string.empty": "帳號不能為空",
    "string.min": "帳號至少需 3 個字元",
    "any.required": "帳號為必填",
  }),
  password: Joi.string().min(6).required().messages({
    "string.base": "密碼必須是文字",
    "string.empty": "密碼不能為空",
    "string.min": "密碼至少需 6 個字元",
    "any.required": "密碼為必填",
  }),
});

// 更新員工帳號驗證
export const updateUserSchema = Joi.object({
  account: Joi.string().min(3).messages({
    "string.base": "帳號必須是文字",
    "string.empty": "帳號不能為空",
    "string.min": "帳號至少需 3 個字元",
  }),
  password: Joi.string().min(6).messages({
    "string.base": "密碼必須是文字",
    "string.empty": "密碼不能為空",
    "string.min": "密碼至少需 6 個字元",
  }),
})
  .or("account", "password")
  .messages({
    "object.missing": "請至少提供帳號或密碼其中一項進行更新",
  });
