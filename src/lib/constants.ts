import { AudioBitrate } from "@/types/conversion";

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit
export const MAX_FILE_SIZE_LABEL = "500 MB";

export const SUPPORTED_EXTENSIONS = [".mp4"];
export const SUPPORTED_MIME_TYPES = [
  "video/mp4",
  "video/x-m4v",
];

export const BITRATE_OPTIONS: { value: AudioBitrate; label: string; description: string }[] = [
  { value: 96, label: "96 kbps", description: "Smaller file size, lower fidelity" },
  { value: 128, label: "128 kbps", description: "Standard basic quality" },
  { value: 192, label: "192 kbps (Recommended)", description: "Optimal balance of quality and size" },
  { value: 256, label: "256 kbps", description: "High quality audio" },
  { value: 320, label: "320 kbps (Best)", description: "Maximum supported MP3 fidelity" },
];

export const DEFAULT_BITRATE: AudioBitrate = 192;
export const DEFAULT_FORMAT = "mp3" as const;
