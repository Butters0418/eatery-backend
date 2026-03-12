import { RequestHandler } from "express";
import Order, { OrderListItem } from "../models/Order";
import Table from "../models/Table";
import { TableStatus } from "../models/Table";
import { AuthRequest } from "../middleware/authMiddleware";
import { createOrderSchema, updateOrderItemSchema } from "../validations/orderValidation";
import mongoose from "mongoose";
import crypto from "crypto";
import { broadcastExceptSender, broadcastToAllStaff } from "../websocket/broadcast";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// 產生外帶訂單編號
const generateTakeoutCode = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const count = await Order.countDocuments({
    orderType: "外帶",
    createdAt: { $gte: today, $lt: tomorrow },
  });
  const code = `A-${String(count + 1).padStart(3, "0")}`;
  return code;
};

// 產生內用訂單編號
const generateDineInCode = async (tableNumber: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const prefix = `T-${String(tableNumber).padStart(2, "0")}`;
  const count = await Order.countDocuments({
    orderType: "內用",
    orderCode: { $regex: `^${prefix}` },
    createdAt: { $gte: today, $lt: tomorrow },
  });
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
};

// 取得訂單總金額
const calculateTotalPrice = (orderList: OrderListItem[]): number => {
  return orderList.reduce((total, entry) => {
    const itemSum = entry.item.reduce((sum, p) => {
      const addonsTotal =
        p.addons
          ?.flatMap((a) => a.options)
          .filter((o) => o.selected)
          .reduce((a, o) => a + o.price, 0) || 0;
      return sum + (p.price + addonsTotal) * p.qty;
    }, 0);
    return total + itemSum;
  }, 0);
};

// ❌ 300 - 取得所有訂單 (使用309)
export const getAllOrders: RequestHandler = async (req, res, next) => {
  try {
    const { date, type } = req.query;
    const query: any = {};

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);
      query.createdAt = { $gte: start, $lte: end };
    }

    if (type && (type === "內用" || type === "外帶")) {
      query.orderType = type;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).populate("tableId", "tableNumber"); //（可加篩選條件）
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// 301 - 取得單筆訂單（ 限 admin / staff，查詢已刪除訂單 (admin) ）
export const getOrderById: RequestHandler = async (req: AuthRequest, res, next) => {
  const orderId = req.params.id;
  const includeDeleted = req.query.includeDeleted === "true";

  // 權限判斷
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
    res.status(403).json({ message: "只有管理員與員工可以查詢訂單" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "無效的訂單 ID" });
    return;
  }

  try {
    // 若非 admin 且未帶入 includeDeleted，排除 isDeleted = true 的訂單
    const query: any = { _id: orderId };
    if (!includeDeleted || req.user.role !== "admin") {
      query.isDeleted = { $ne: true };
    }

    const order = await Order.findOne(query).populate("tableId", "tableNumber").populate("orderList.createdBy", "account");

    if (!order) {
      res.status(404).json({ message: "找不到該訂單" });
      return;
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// 302 - 新增訂單（支援內用、外帶）
export const createOrder: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    // 使用 external 驗證商品是否存在
    await createOrderSchema.validateAsync(req.body);
    const { orderType, tableId, tableToken, orderList }: { orderType: string; tableId: string; tableToken: string; orderList: OrderListItem[] } = req.body;
    const isAdminOrStaff = !!req.user;
    const createdBy = isAdminOrStaff ? req.user?.userId : null;

    if (isAdminOrStaff && !req.user?.userId) {
      res.status(401).json({ message: "登入資訊已過期，請重新登入" });
      return;
    }

    // ----------------- 外帶 -----------------
    if (orderType === "外帶") {
      if (!isAdminOrStaff) {
        res.status(403).json({ message: "外帶訂單僅限店員操作" });
        return;
      }
      const orderCode = await generateTakeoutCode();
      const orderListWithCode = orderList.map((entry, i) => ({
        ...entry,
        itemCode: `${orderCode}-${i + 1}`,
        createdBy: createdBy as mongoose.Types.ObjectId | null,
      }));

      const newOrder = new Order({
        orderType,
        orderCode,
        orderList: orderListWithCode,
        totalPrice: calculateTotalPrice(orderListWithCode),
        isAllServed: false,
        isPaid: true, // 外帶預設定單成立是已結帳
        isComplete: false,
      });

      await newOrder.save();

      // websocket 外帶推播給其他 staff/admin
      broadcastExceptSender(req.user!.userId, {
        type: "newOrder",
        data: {
          orderId: newOrder._id,
          orderType: newOrder.orderType,
          orderCode: newOrder.orderCode,
          tableNumber: null,
          createdAt: newOrder.createdAt,
        },
      });

      res.status(201).json({ message: "外帶訂單建立成功", order: newOrder });
      return;
    }

    // ----------------- 內用 -----------------
    const table = await Table.findById(tableId);
    if (!table) {
      res.status(404).json({ message: "找不到該桌號" });
      return;
    }

    // 一般顧客必須驗證 tableToken，admin/staff 可跳過
    if (!isAdminOrStaff) {
      if (!tableToken) {
        res.status(400).json({ message: "缺少桌號驗證 token，請重新掃描 QRCode" });
        return;
      }
      if (table.tableToken !== tableToken) {
        res.status(400).json({ message: "桌號驗證失敗，請重新掃描 QRCode" });
        return;
      }
    }

    const existingOrder = await Order.findById(table.currentOrder);

    // 如果有訂單 & 尚未結帳 => 視為加點流程
    if (existingOrder && !existingOrder.isPaid && !existingOrder.isComplete) {
      // 找出目前 itemCode 的最大流水號
      const maxIndex = existingOrder.orderList
        .map((entry) => {
          const parts = entry.itemCode.split("-");
          return parseInt(parts[parts.length - 1], 10);
        })
        .reduce((max, current) => Math.max(max, current), 0);

      const newItemCodes = orderList.map((_, i) => `${existingOrder.orderCode}-${maxIndex + i + 1}`);
      const newList = orderList.map((entry, i) => ({
        ...entry,
        itemCode: newItemCodes[i],
        createdBy: createdBy as mongoose.Types.ObjectId | null,
      }));

      existingOrder.orderList.push(...newList);
      existingOrder.totalPrice = calculateTotalPrice(existingOrder.orderList);
      existingOrder.isAllServed = existingOrder.orderList.length > 0 && existingOrder.orderList.every((entry) => entry.isServed);

      existingOrder.updatedAt = new Date();

      await existingOrder.save();

      // 加點推播
      if (isAdminOrStaff) {
        broadcastExceptSender(req.user!.userId, {
          type: "newItem",
          data: {
            orderId: existingOrder._id,
            orderType: existingOrder.orderType,
            orderCode: existingOrder.orderCode,
            tableNumber: table.tableNumber,
            createdAt: existingOrder.createdAt,
          },
        });
      } else {
        broadcastToAllStaff({
          type: "newItem",
          data: {
            orderId: existingOrder._id,
            orderType: existingOrder.orderType,
            orderCode: existingOrder.orderCode,
            tableNumber: table.tableNumber,
            createdAt: existingOrder.createdAt,
          },
        });
      }

      res.status(200).json({ message: "加點成功", order: existingOrder });
      return;
    }

    // 桌子空閒 => 新訂單流程
    if (table.status === TableStatus.Available) {
      const orderCode = await generateDineInCode(table.tableNumber);
      const orderListWithCode = orderList.map((entry, i) => ({
        ...entry,
        itemCode: `${orderCode}-${i + 1}`,
        createdBy: createdBy as mongoose.Types.ObjectId | null,
      }));

      const newOrder = new Order({
        orderType,
        orderCode,
        tableId,
        orderList: orderListWithCode,
        totalPrice: calculateTotalPrice(orderListWithCode),
        isAllServed: false,
        isPaid: false,
        isComplete: false,
      });

      await newOrder.save();

      table.status = TableStatus.InUse;
      table.currentOrder = newOrder._id as mongoose.Types.ObjectId;
      await table.save();

      // 新內用訂單推播
      if (isAdminOrStaff) {
        broadcastExceptSender(req.user!.userId, {
          type: "newOrder",
          data: {
            orderId: newOrder._id,
            orderType: newOrder.orderType,
            orderCode: newOrder.orderCode,
            tableNumber: table.tableNumber,
            createdAt: newOrder.createdAt,
          },
        });
      } else {
        broadcastToAllStaff({
          type: "newOrder",
          data: {
            orderId: newOrder._id,
            orderType: newOrder.orderType,
            orderCode: newOrder.orderCode,
            tableNumber: table.tableNumber,
            createdAt: newOrder.createdAt,
          },
        });
      }

      res.status(201).json({ message: "訂單建立成功", order: newOrder });
      return;
    }

    // 桌子狀態是使用中，但沒有 currentOrder => 資料異常
    res.status(409).json({ message: "桌位狀態異常，請聯絡管理員" });
    return;
  } catch (err: unknown) {
    if (err instanceof Error && (err as any).isJoi) {
      const joiErr = err as any;
      res.status(400).json({ message: joiErr.details[0].message });
    } else {
      next(err);
    }
  }
};

// 303 - 編輯訂單之單次點餐 item
export const updateOrderItem: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const orderId = req.params.id;
    const itemCode = req.params.itemCode;
    const { item } = req.body;

    // Joi 非同步驗證 item 結構
    try {
      await updateOrderItemSchema.validateAsync({ item });
    } catch (error: any) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    // 檢查 order 是否存在
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到訂單" });
      return;
    }

    // 檢查 order 是否已刪除
    if (order.isDeleted) {
      res.status(403).json({ message: "該訂單已刪除，無法執行此操作" });
      return;
    }

    // 找到對應 itemCode 的 entry
    const entryIndex = order.orderList.findIndex((entry) => entry.itemCode === itemCode);
    if (entryIndex === -1) {
      res.status(404).json({ message: "找不到指定的訂單項目 (itemCode)" });
      return;
    }

    // 若已送餐不可編輯
    if (order.orderList[entryIndex].isServed) {
      res.status(403).json({ message: "此餐點已送出，無法修改" });
      return;
    }

    // 替換 item 陣列
    order.orderList[entryIndex].item = item;

    // 重新計算總金額
    order.totalPrice = calculateTotalPrice(order.orderList);

    order.updatedAt = new Date();
    await order.save();

    // ✅ 推播通知：告訴其他 staff/admin 該訂單有被修改
    const table = order.tableId ? await Table.findById(order.tableId) : null;
    broadcastExceptSender(req.user!.userId, {
      type: "orderUpdated",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber: table?.tableNumber || null,
        updatedAt: order.updatedAt,
      },
    });

    res.json({ message: "訂單已更新", order });
  } catch (err) {
    next(err);
  }
};

// 304 - 刪除單一點餐 item
export const deleteOrderItem: RequestHandler = async (req: AuthRequest, res, next) => {
  const orderId = req.params.id;
  const itemCode = req.params.itemCode;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "無效的訂單 ID" });
    return;
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到該訂單" });
      return;
    }

    // 檢查 order 是否已刪除
    if (order.isDeleted) {
      res.status(403).json({ message: "該訂單已刪除，無法執行此操作" });
      return;
    }

    const entryIndex = order.orderList.findIndex((entry) => entry.itemCode === itemCode);
    if (entryIndex === -1) {
      res.status(404).json({ message: "找不到指定的訂單項目 (itemCode)" });
      return;
    }

    // 若該筆已送餐，不可刪除
    if (order.orderList[entryIndex].isServed) {
      res.status(403).json({ message: "已出餐項目無法刪除" });
      return;
    }

    // 刪除該筆項目
    order.orderList.splice(entryIndex, 1);

    // 更新 totalPrice
    order.totalPrice = calculateTotalPrice(order.orderList);

    // ✅ 檢查 orderList 是否為空，如果是則自動軟刪除整張訂單
    if (order.orderList.length === 0) {
      order.isDeleted = true;
      order.isAllServed = false; // 空訂單不算已出餐
      order.updatedAt = new Date();

      // 如果是內用，要更新桌位狀態
      let tableNumber = null;
      if (order.orderType === "內用" && order.tableId) {
        const table = await Table.findById(order.tableId);
        if (table) {
          tableNumber = table.tableNumber;
          table.status = TableStatus.Available;
          table.tableToken = crypto.randomUUID();
          table.currentOrder = null;
          await table.save();
        }
      }

      await order.save();

      broadcastExceptSender(req.user!.userId, {
        type: "deleteOrder", // 改為刪除整張訂單的事件
        data: {
          orderId: order._id,
          orderType: order.orderType,
          orderCode: order.orderCode,
          tableNumber,
          reason: "所有項目已刪除，訂單自動移除",
        },
      });

      res.json({ message: "最後一個項目已刪除，訂單已自動移除", order });
      return;
    }

    // 檢查是否所有項目都已出餐
    order.isAllServed = order.orderList.length > 0 && order.orderList.every((entry) => entry.isServed);
    await order.save();

    const table = order.tableId ? await Table.findById(order.tableId) : null;
    broadcastExceptSender(req.user!.userId, {
      type: "deleteOrderItem",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber: table?.tableNumber || null,
        itemCode,
      },
    });

    res.json({ message: "訂單項目已刪除", order });
  } catch (err) {
    next(err);
  }
};

// 305 - 刪除訂單（軟刪除)
export const softDeleteOrder: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到訂單" });
      return;
    }

    // 若已刪除，回報
    if (order.isDeleted) {
      res.status(400).json({ message: "訂單已刪除" });
      return;
    }

    // 若已結帳，不可刪除
    if (order.orderType === "內用" && order.isPaid) {
      res.status(403).json({ message: "已結帳的訂單不可刪除" });
      return;
    }

    // 若任何一筆 item 已送餐，不可刪除
    const hasServedItem = order.orderList.some((entry) => entry.isServed);
    if (hasServedItem) {
      res.status(403).json({ message: "訂單中已有出餐項目，不可刪除" });
      return;
    }

    // 通過條件，執行軟刪除
    order.isDeleted = true;
    order.updatedAt = new Date();

    // 如果是內用，要更新桌位狀態
    let tableNumber = null;
    if (order.orderType === "內用" && order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table) {
        tableNumber = table.tableNumber;
        table.status = TableStatus.Available;
        table.tableToken = crypto.randomUUID();
        table.currentOrder = null;
        await table.save();
      }
    }

    await order.save();
    broadcastExceptSender(req.user!.userId, {
      type: "deleteOrder",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber,
      },
    });

    res.json({ message: "訂單已軟刪除", order });
  } catch (err) {
    next(err);
  }
};

// 306 - 更新單一點餐的出餐狀態 (toggle 版)
export const markItemAsServed: RequestHandler = async (req: AuthRequest, res, next) => {
  const orderId = req.params.id;
  const itemCode = req.params.itemCode;
  const { isServed } = req.body; // 取得新的 isServed 狀態

  if (typeof isServed !== "boolean") {
    res.status(400).json({ message: "請提供正確的 isServed 狀態 (true 或 false)" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "無效的訂單 ID" });
    return;
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到訂單" });
      return;
    }

    if (order.isDeleted) {
      res.status(403).json({ message: "該訂單已刪除，無法執行此操作" });
      return;
    }

    // 內用訂單已結帳，不能取消出餐
    if (order.orderType === "內用" && order.isPaid && isServed === false) {
      res.status(403).json({ message: "內用訂單已結帳，不可取消出餐狀態" });
      return;
    }

    const entry = order.orderList.find((entry) => entry.itemCode === itemCode);
    if (!entry) {
      res.status(404).json({ message: "找不到指定的訂單項目 (itemCode)" });
      return;
    }

    // 更新指定項目的 isServed 狀態
    entry.isServed = isServed;

    // 檢查整張訂單是否所有項目都出餐
    order.isAllServed = order.orderList.length > 0 && order.orderList.every((entry) => entry.isServed);

    order.updatedAt = new Date();
    await order.save();

    const table = order.tableId ? await Table.findById(order.tableId) : null;
    broadcastExceptSender(req.user!.userId, {
      type: "itemServed",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber: table?.tableNumber || null,
        itemCode: entry.itemCode,
        isServed: entry.isServed,
      },
    });

    res.status(200).json({ message: "項目出餐狀態已更新", order });
  } catch (err) {
    next(err);
  }
};

// 307 - 更新訂單的結帳狀態 (toggle 版)
export const markOrderAsPaid: RequestHandler = async (req: AuthRequest, res, next) => {
  const orderId = req.params.id;
  const { isPaid } = req.body; // 取得新的 isPaid 狀態

  if (typeof isPaid !== "boolean") {
    res.status(400).json({ message: "請提供正確的 isPaid 狀態 (true 或 false)" });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "無效的訂單 ID" });
    return;
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到訂單" });
      return;
    }

    if (order.isDeleted) {
      res.status(403).json({ message: "該訂單已刪除，無法執行此操作" });
      return;
    }

    if (order.orderType === "內用" && isPaid === true && !order.isAllServed) {
      res.status(403).json({ message: "內用訂單需全部出餐後才能結帳" });
      return;
    }

    order.isPaid = isPaid;
    order.updatedAt = new Date();
    await order.save();

    const table = order.tableId ? await Table.findById(order.tableId) : null;
    broadcastExceptSender(req.user!.userId, {
      type: "orderPaid",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber: table?.tableNumber || null,
        isPaid: order.isPaid,
      },
    });

    res.status(200).json({ message: "訂單結帳狀態已更新", order });
  } catch (err) {
    next(err);
  }
};

// 308 - 訂單完成
export const completeOrder: RequestHandler = async (req: AuthRequest, res, next) => {
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "無效的訂單 ID" });
    return;
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: "找不到訂單" });
      return;
    }

    // 檢查 order 是否已刪除
    if (order.isDeleted) {
      res.status(403).json({ message: "該訂單已刪除，無法執行此操作" });
      return;
    }

    if (order.isComplete) {
      res.status(400).json({ message: "訂單已完成" });
      return;
    }

    if (!order.isAllServed || !order.isPaid) {
      res.status(403).json({ message: "訂單尚未全部出餐並結帳，無法完成" });
      return;
    }

    // 標記訂單為已完成
    order.isComplete = true;
    order.updatedAt = new Date();

    // 如果是內用，要更新桌位狀態
    let tableNumber = null;
    if (order.orderType === "內用" && order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table) {
        tableNumber = table.tableNumber;
        table.status = TableStatus.Available;
        table.tableToken = crypto.randomUUID();
        table.currentOrder = null;
        await table.save();
      }
    }

    await order.save();

    broadcastExceptSender(req.user!.userId, {
      type: "orderCompleted",
      data: {
        orderId: order._id,
        orderType: order.orderType,
        orderCode: order.orderCode,
        tableNumber,
      },
    });

    res.status(200).json({ message: "訂單已完成", order });
  } catch (err) {
    next(err);
  }
};

// 309 - 取得訂單(整合)
export const getOrders: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const { date, isAllServed, orderType, tableId, isPaid, isComplete, includeDeleted, tableToken } = req.query;

    const hasToken = !!req.headers.authorization;
    const isCustomer = !hasToken && typeof tableToken === "string";

    // ---------------- 顧客端 ----------------
    if (isCustomer) {
      const table = await Table.findOne({ tableToken });
      if (!table) {
        res.status(404).json({ message: "找不到對應桌號" });
        return;
      }

      if (!table.currentOrder) {
        res.status(404).json({ message: "目前無進行中的訂單" });
        return;
      }

      const order = await Order.findOne({
        _id: table.currentOrder,
        isDeleted: { $ne: true },
      }).populate("tableId", "tableNumber");

      if (!order) {
        res.status(404).json({ message: "找不到訂單" });
        return;
      }

      res.json([order]); // 顧客查詢也維持回傳陣列格式
      return;
    }

    // ---------------- 管理端 ----------------
    const user = req.user;
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      res.status(403).json({ message: "只有店員與管理員可查詢訂單" });
      return;
    }

    const query: any = {};

    //  除非 admin 明確自帶 includeDeleted=true，否則排除 isDeleted
    // if (!(includeDeleted === "true" && user.role === "admin")) {
    //   query.isDeleted = { $ne: true };
    // }

    // 📅 日期查詢：如果沒有提供 date，預設使用今日
    // 從前端拿到 date = '2025-11-27'，或預設使用今日台灣日期
    const targetDate = date || dayjs().tz("Asia/Taipei").format("YYYY-MM-DD");

    // 轉換為台灣當日的 UTC 時間範圍
    const start = dayjs.tz(`${targetDate} 00:00`, "Asia/Taipei").utc().toDate();
    const end = dayjs.tz(`${targetDate} 23:59:59.999`, "Asia/Taipei").utc().toDate();

    query.createdAt = { $gte: start, $lte: end };

    if (orderType === "內用" || orderType === "外帶") {
      query.orderType = orderType;
    }

    if (isPaid === "true") query.isPaid = true;
    if (isPaid === "false") query.isPaid = false;
    if (isAllServed === "true") query.isAllServed = true;
    if (isAllServed === "false") query.isAllServed = false;
    if (isComplete === "true") query.isComplete = true;
    if (isComplete === "false") query.isComplete = false;

    if (tableId) {
      query.tableId = tableId;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).populate("tableId", "tableNumber");

    res.json(orders);
  } catch (err) {
    next(err);
  }
};
