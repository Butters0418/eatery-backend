import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  account: string;
  password: string;
  role: "admin" | "staff";
  isLocked: boolean;
  loginFailCount: number;
  verificationCode?: string | null;
  verificationExpires?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    account: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff"], required: true },
    isLocked: { type: Boolean, default: false },
    loginFailCount: { type: Number, default: 0 },
    verificationCode: { type: String, default: null },
    verificationExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
