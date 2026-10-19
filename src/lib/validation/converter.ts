import { z } from "zod";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from "@/lib/constants";
import { AudioBitrate, OutputFormat } from "@/types/conversion";

export const SUPPORTED_AUDIO_FORMATS: OutputFormat[] = [
  "mp3",
  "wav",
  "flac",
  "aac",
  "ogg",
  "opus",
];

export const audioMetadataSchema = z.object({
  title: z.string().max(120).optional(),
  artist: z.string().max(120).optional(),
  album: z.string().max(120).optional(),
  year: z.string().max(10).optional(),
  genre: z.string().max(50).optional(),
  embedThumbnailArt: z.boolean().optional(),
});

export const conversionSettingsSchema = z.object({
  format: z.enum(["mp3", "wav", "flac", "aac", "ogg", "opus"]).default("mp3"),
  bitrate: z.union([
    z.literal(96),
    z.literal(128),
    z.literal(192),
    z.literal(256),
    z.literal(320),
  ]),
  trimStartSec: z.number().min(0).optional(),
  trimEndSec: z.number().min(0).optional(),
  normalizeAudio: z.boolean().optional(),
  volumeMultiplier: z.number().min(0.25).max(3.0).optional(),
  fadeInDurationSec: z.number().min(0).max(30).optional(),
  fadeOutDurationSec: z.number().min(0).max(30).optional(),
  playbackSpeed: z.number().min(0.5).max(2.0).optional(),
  metadata: audioMetadataSchema.optional(),
});

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSelectedFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: "Please select a file to convert." };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  const hasValidMime =
    !file.type || SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase());

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Please select an MP4 file. Other video formats are not currently supported.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "The selected file appears to be empty. Please choose a valid MP4 file.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `This file exceeds the ${MAX_FILE_SIZE_LABEL} upload limit. Please select a smaller file.`,
    };
  }

  return { valid: true };
}

export function isValidBitrate(val: number): val is AudioBitrate {
  return [96, 128, 192, 256, 320].includes(val);
}

export function isValidFormat(val: string): val is OutputFormat {
  return SUPPORTED_AUDIO_FORMATS.includes(val as OutputFormat);
}
