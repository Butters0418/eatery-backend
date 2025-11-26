import { boolean } from "joi";
import mongoose, { Schema, Document } from "mongoose";

interface AddonOption {
  name: string;
  price: number;
  selected: boolean;
}

interface Addon {
  group: string;
  options: AddonOption[];
}

interface OrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  addons: Addon[] | null;
  compositeId?: string; // 添加 compositeId 字段，用於識別相同產品不同配料的項目
}

export interface OrderListItem {
  itemCode: string;
  item: OrderItem[];
  isServed: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
}

export interface IOrder extends Document {
  orderType: "內用" | "外帶";
  orderCode: string;
  tableId?: mongoose.Types.ObjectId;
  orderList: OrderListItem[];
  totalPrice: number;
  isAllServed: boolean;
  isPaid: boolean;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

const AddonOptionSchema = new Schema<AddonOption>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    selected: { type: Boolean, required: true },
  },
  { _id: false }
);

const AddonSchema = new Schema<Addon>(
  {
    group: { type: String, required: true },
    options: { type: [AddonOptionSchema], required: true },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    addons: { type: [AddonSchema], default: null },
    compositeId: { type: String }, // 保存前端傳來的複合ID
  },
  { _id: false }
);

const OrderListItemSchema = new Schema<OrderListItem>(
  {
    itemCode: { type: String, required: true },
    item: { type: [OrderItemSchema], required: true },
    isServed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderType: { type: String, enum: ["內用", "外帶"], required: true },
    orderCode: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    orderList: { type: [OrderListItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    isAllServed: { type: Boolean, required: true, default: false },
    isPaid: { type: Boolean, required: true, default: false },
    isComplete: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
