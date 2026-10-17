import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICleanupTask extends Document {
  storageKey: string;
  targetType: "input" | "output" | "temp";
  attempt: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const CleanupTaskSchema = new Schema<ICleanupTask>(
  {
    storageKey: { type: String, required: true, index: true },
    targetType: { type: String, enum: ["input", "output", "temp"], required: true },
    attempt: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastError: { type: String },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CleanupTask: Model<ICleanupTask> =
  mongoose.models.CleanupTask || mongoose.model<ICleanupTask>("CleanupTask", CleanupTaskSchema);
