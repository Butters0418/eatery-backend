import mongoose, { Schema, Document } from "mongoose";

export interface IAddonOption {
  name: string;
  price: number;
}

export interface IAddonGroup {
  group: string;
  options: IAddonOption[];
}

export interface IProduct extends Document {
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular: boolean;
  addons?: IAddonGroup[];
  created_at: Date;
  updated_at: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: false },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, required: true, default: true },
    isPopular: { type: Boolean, required: true, default: false },
    addons: { type: Array, default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model<IProduct>("Product", ProductSchema);
