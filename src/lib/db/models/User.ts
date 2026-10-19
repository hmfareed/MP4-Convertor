import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "deleted";
  defaultBitrate: number;
  defaultFormat?: "mp3" | "wav" | "flac" | "aac" | "ogg" | "opus";
  autoDownload?: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    defaultBitrate: { type: Number, default: 192 },
    defaultFormat: {
      type: String,
      enum: ["mp3", "wav", "flac", "aac", "ogg", "opus"],
      default: "mp3",
    },
    autoDownload: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
