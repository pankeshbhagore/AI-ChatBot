import { Schema, model, Document as MDocument } from "mongoose";

export interface IUser extends MDocument {
  email: string;
  password: string; // bcrypt hash
  role: "admin";
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin"], default: "admin" },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
