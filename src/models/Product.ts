import mongoose, { Schema, Document } from "mongoose";

interface AddonOption {
  name: string;
  price: number;
}

interface AddonGroup {
  group: string;
  options: AddonOption[];
}

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular: boolean;
  addons: AddonGroup[];
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

const AddonGroupSchema = new Schema<AddonGroup>(
  {
    group: { type: String, required: true },
    options: { type: [AddonOptionSchema], required: true },
  },
  { _id: false }
);

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, required: true },
    isPopular: { type: Boolean, default: false },
    addons: { type: [AddonGroupSchema], default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", ProductSchema);
