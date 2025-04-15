import mongoose, { Schema, Document } from "mongoose";

interface AddonOption {
  name: string;
  price: number;
}

interface Addon {
  group: string;
  options: AddonOption[];
}

interface OrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  addons: Addon[];
}

interface OrderListItem {
  itemCode: string;
  item: OrderItem[];
  isServed: boolean;
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
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AddonOptionSchema = new Schema<AddonOption>(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const AddonSchema = new Schema<Addon>(
  {
    group: { type: String, required: true },
    options: { type: [AddonOptionSchema], default: [] },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    addons: { type: [AddonSchema], default: [] },
  },
  { _id: false }
);

const OrderListItemSchema = new Schema<OrderListItem>(
  {
    itemCode: { type: String, required: true },
    item: { type: [OrderItemSchema], required: true },
    isServed: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderType: { type: String, enum: ["內用", "外帶"], required: true },
    orderCode: { type: String, required: true, unique: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    orderList: { type: [OrderListItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    isAllServed: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    isComplete: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
