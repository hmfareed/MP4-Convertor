import mongoose, { Schema, Document, Model } from "mongoose";
import { JobStatus, OutputFormat } from "@/types/conversion";

export interface IConversionJob extends Document {
  ownerType: "guest" | "user";
  ownerId: string;
  guestTokenHash?: string;
  batchId?: string;
  uploadId: mongoose.Types.ObjectId;
  originalFilename: string;
  fileSizeBytes: number;
  status: JobStatus;
  settings: {
    format?: OutputFormat;
    bitrateKbps: number;
    trimStartSec?: number;
    trimEndSec?: number;
    normalizeAudio?: boolean;
    volumeMultiplier?: number;
    fadeInDurationSec?: number;
    fadeOutDurationSec?: number;
    playbackSpeed?: number;
  };
  idempotencyKey?: string;
  attempt: number;
  progressPercent: number;
  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  processingMs?: number;
  errorCode?: string;
  errorMessageSafe?: string;
  output?: {
    storageKey: string;
    filename: string;
    format?: OutputFormat;
    sizeBytes: number;
    durationSec: number;
    bitrateKbps: number;
  };
  expiresAt: Date;
  cancelRequestedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionJobSchema = new Schema<IConversionJob>(
  {
    ownerType: { type: String, enum: ["guest", "user"], default: "guest", required: true },
    ownerId: { type: String, required: true, index: true },
    guestTokenHash: { type: String, index: true },
    batchId: { type: String, index: true },
    uploadId: { type: Schema.Types.ObjectId, ref: "Upload", required: true },
    originalFilename: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    status: {
      type: String,
      enum: ["uploading", "queued", "processing", "completed", "failed", "cancelled", "expired"],
      default: "queued",
      required: true,
      index: true,
    },
    settings: {
      format: {
        type: String,
        enum: ["mp3", "wav", "flac", "aac", "ogg", "opus"],
        default: "mp3",
      },
      bitrateKbps: { type: Number, required: true },
      trimStartSec: { type: Number },
      trimEndSec: { type: Number },
      normalizeAudio: { type: Boolean, default: false },
      volumeMultiplier: { type: Number, default: 1.0 },
      fadeInDurationSec: { type: Number, default: 0 },
      fadeOutDurationSec: { type: Number, default: 0 },
      playbackSpeed: { type: Number, default: 1.0 },
    },
    idempotencyKey: { type: String, index: true },
    attempt: { type: Number, default: 1 },
    progressPercent: { type: Number, default: 0 },
    queuedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    processingMs: { type: Number },
    errorCode: { type: String },
    errorMessageSafe: { type: String },
    output: {
      storageKey: { type: String },
      filename: { type: String },
      format: { type: String, default: "mp3" },
      sizeBytes: { type: Number },
      durationSec: { type: Number },
      bitrateKbps: { type: Number },
    },
    expiresAt: { type: Date, required: true, index: true },
    cancelRequestedAt: { type: Date },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
ConversionJobSchema.index({ ownerId: 1, createdAt: -1 });
ConversionJobSchema.index({ batchId: 1, createdAt: -1 });
ConversionJobSchema.index({ status: 1, queuedAt: 1 });
ConversionJobSchema.index(
  { ownerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

export const ConversionJob: Model<IConversionJob> =
  mongoose.models.ConversionJob ||
  mongoose.model<IConversionJob>("ConversionJob", ConversionJobSchema);
