import { RequestHandler } from "express";
import Order, { OrderListItem } from "../models/Order";
import Table from "../models/Table";
import { TableStatus } from "../models/Table";
import { AuthRequest } from "../middleware/authMiddleware";
import { createOrderSchema } from "../validations/orderValidation";
import mongoose from "mongoose";

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
      const addonsTotal = p.addons?.flatMap((a) => a.options).reduce((a, o) => a + o.price, 0) || 0;
      return sum + (p.price + addonsTotal) * p.qty;
    }, 0);
    return total + itemSum;
  }, 0);
};

// 300 - 取得所有訂單
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
        isPaid: false,
        isComplete: false,
      });

      await newOrder.save();
      res.status(201).json({ message: "外帶訂單建立成功", order: newOrder });
      return;
    }

    // ----------------- 內用 -----------------
    const table = await Table.findById(tableId);
    if (!table) {
      res.status(404).json({ message: "找不到該桌號" });
      return;
    }

    if (!isAdminOrStaff && table.qrToken !== tableToken) {
      res.status(400).json({ message: "桌號驗證失敗，請重新掃描 QRCode" });
      return;
    }

    const existingOrder = await Order.findById(table.currentOrder);

    // 如果有訂單 & 尚未結帳 => 視為加點流程
    if (existingOrder && !existingOrder.isPaid && !existingOrder.isComplete) {
      const currentCount = existingOrder.orderList.length;
      const newItemCodes = orderList.map((_, i) => `${existingOrder.orderCode}-${currentCount + i + 1}`);
      const newList = orderList.map((entry, i) => ({ ...entry, itemCode: newItemCodes[i], createdBy: createdBy as mongoose.Types.ObjectId | null }));

      existingOrder.orderList.push(...newList);
      existingOrder.totalPrice = calculateTotalPrice(existingOrder.orderList);
      existingOrder.updatedAt = new Date();

      await existingOrder.save();
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
