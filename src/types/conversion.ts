export type AudioBitrate = 96 | 128 | 192 | 256 | 320;

export type OutputFormat = "mp3" | "wav" | "flac" | "aac" | "ogg" | "opus";

export type JobStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  embedThumbnailArt?: boolean;
}

export interface ConversionSettings {
  format: OutputFormat;
  bitrate: AudioBitrate;
  trimStartSec?: number;
  trimEndSec?: number;
  // Audio Enhancement Suite
  normalizeAudio?: boolean;
  volumeMultiplier?: number;
  fadeInDurationSec?: number;
  fadeOutDurationSec?: number;
  playbackSpeed?: number;
  // ID3 Tag & Metadata Editor
  metadata?: AudioMetadata;
}

export interface SelectedFileMetadata {
  file: File;
  name: string;
  size: number;
  type: string;
  duration?: number;
}

export interface ConversionJob {
  id: string;
  batchId?: string;
  originalFilename: string;
  outputFilename?: string;
  fileSize: number;
  duration?: number;
  bitrate: AudioBitrate;
  format: OutputFormat;
  status: JobStatus;
  progress: number; // 0 - 100
  statusMessage?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
  audioUrl?: string;
  shareToken?: string;
  expiresAt?: string;
}

export interface BatchConversion {
  batchId: string;
  jobs: ConversionJob[];
  totalJobs: number;
  completedCount: number;
  failedCount: number;
  overallProgress: number;
  isComplete: boolean;
  zipDownloadUrl?: string;
}
