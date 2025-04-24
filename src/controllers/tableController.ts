import mongoose from "mongoose";
import { RequestHandler } from "express";
import Table from "../models/Table";
import { createTableSchema, updateTableSchema } from "../validations/tableValidation";
import crypto from "crypto";
import { AuthRequest } from "../middleware/authMiddleware";
import { TableStatus } from "../models/Table";

// 400 查詢所有桌位
export const getAllTables: RequestHandler = async (_req, res, next) => {
  try {
    const tables = await Table.find();
    res.json(tables);
  } catch (err) {
    next(err);
  }
};

// 401 取得單一桌位資訊
export const getTableById: RequestHandler = async (req, res, next) => {
  const tableId = req.params.id;

  // 檢查 ID 是否為合法 ObjectId
  if (!mongoose.Types.ObjectId.isValid(tableId)) {
    res.status(400).json({ message: "無效的桌位 ID" });
    return;
  }

  try {
    const table = await Table.findById(tableId);

    if (!table) {
      res.status(404).json({ message: "找不到該桌位" });
      return;
    }
    res.json(table);
  } catch (err) {
    next(err);
  }
};

// 402 - 後台新增桌位
export const createTable: RequestHandler = async (req, res, next) => {
  try {
    // Joi 驗證
    const { error } = createTableSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { tableNumber, qrImage } = req.body;

    // 檢查是否已有相同桌號
    const existing = await Table.findOne({ tableNumber });
    if (existing) {
      res.status(409).json({ message: "該桌號已存在" });
      return;
    }

    // 建立新桌位資料
    const newTable = new Table({
      tableNumber,
      qrImage,
      status: TableStatus.Available,
      qrToken: crypto.randomUUID(), // 產生 16碼 token
    });

    await newTable.save();
    res.status(201).json({ message: "成功新增桌位", table: newTable });
  } catch (err) {
    next(err);
  }
};

// 403 - 後台更新桌位
export const updateTable: RequestHandler = async (req, res, next) => {
  const tableId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(tableId)) {
    res.status(400).json({ message: "無效的桌位 ID" });
    return;
  }

  const { error } = updateTableSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  try {
    const table = await Table.findById(tableId);
    if (!table) {
      res.status(404).json({ message: "找不到該桌位" });
      return;
    }

    const { tableNumber, qrImage } = req.body;
    if (tableNumber !== undefined) table.tableNumber = tableNumber;
    if (qrImage !== undefined) table.qrImage = qrImage;

    await table.save();
    res.json({ message: "桌位資訊已更新", table });
  } catch (err) {
    next(err);
  }
};

// 404 - 後台刪除桌位
export const deleteTable: RequestHandler = async (req, res, next) => {
  const tableId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(tableId)) {
    res.status(400).json({ message: "無效的桌位 ID" });
    return;
  }

  try {
    const table = await Table.findByIdAndDelete(tableId);

    if (!table) {
      res.status(404).json({ message: "找不到該桌位" });
      return;
    }

    res.json({ message: `已成功刪除桌號 ${table.tableNumber}` });
  } catch (err) {
    next(err);
  }
};

// 405 - 重置桌位 (改由 order 來處理)
export const resetTable: RequestHandler = async (req, res, next) => {
  const tableId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(tableId)) {
    res.status(400).json({ message: "無效的桌位 ID" });
    return;
  }

  try {
    const table = await Table.findById(tableId);
    if (!table) {
      res.status(404).json({ message: "找不到該桌位" });
      return;
    }

    table.status = TableStatus.Available;
    table.qrToken = crypto.randomUUID();
    table.currentOrder = null;
    await table.save();

    res.json({
      message: "桌位已重置，等待下一組客人使用",
      newToken: table.qrToken,
    });
  } catch (err) {
    next(err);
  }
};

// 407 - 取得 QR Code Token
export const getQrTokenByTableCode: RequestHandler = async (req, res, next) => {
  const code = req.query.code;
  if (!code || typeof code !== "string") {
    res.status(400).json({ message: "缺少桌號參數 (code)" });
    return;
  }

  try {
    // 解析出桌號數字
    const match = code.match(/^T-(\d{2})$/);
    if (!match) {
      res.status(400).json({ message: "桌號格式錯誤，應為 T-01 這種格式" });
      return;
    }

    const tableNumber = parseInt(match[1], 10);
    const table = await Table.findOne({ tableNumber });

    if (!table || !table.qrToken) {
      res.status(404).json({ message: "找不到該桌號或尚未分配 QRToken" });
      return;
    }

    res.json({
      qrToken: table.qrToken,
      tableId: table._id,
    });
    return;
  } catch (err) {
    next(err);
  }
};
