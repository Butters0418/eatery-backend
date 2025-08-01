import mongoose, { Schema, Document } from "mongoose";

export enum TableStatus {
  Available = "空閒",
  InUse = "使用中",
}

export interface ITable extends Document {
  tableNumber: number;
  status: TableStatus;
  currentOrder?: mongoose.Types.ObjectId | null;
  qrImage: string;
  tableToken: string;
  updated_at: Date;
}

const TableSchema: Schema<ITable> = new Schema(
  {
    tableNumber: { type: Number, required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(TableStatus),
      required: true,
      default: TableStatus.Available,
    },
    currentOrder: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    qrImage: { type: String, required: true },
    tableToken: { type: String, required: true },
  },
  { timestamps: { updatedAt: "updated_at" } }
);

export default mongoose.model<ITable>("Table", TableSchema);
