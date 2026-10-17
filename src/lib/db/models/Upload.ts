import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUpload extends Document {
  ownerType: "guest" | "user";
  ownerId: string;
  guestTokenHash?: string;
  storageKey: string;
  originalNameSafe: string;
  sizeBytes: number;
  mimeDetected: string;
  probe?: {
    duration?: number;
    codec?: string;
    channels?: number;
    sampleRate?: number;
  };
  expiresAt: Date;
  createdAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    ownerType: { type: String, enum: ["guest", "user"], default: "guest", required: true },
    ownerId: { type: String, required: true, index: true },
    guestTokenHash: { type: String, index: true },
    storageKey: { type: String, required: true },
    originalNameSafe: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    mimeDetected: { type: String, default: "video/mp4" },
    probe: {
      duration: { type: Number },
      codec: { type: String },
      channels: { type: Number },
      sampleRate: { type: Number },
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Auto-expire uploads after retention
UploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Upload: Model<IUpload> =
  mongoose.models.Upload || mongoose.model<IUpload>("Upload", UploadSchema);
