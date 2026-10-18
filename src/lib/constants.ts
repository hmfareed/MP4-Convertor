import { AudioBitrate, OutputFormat } from "@/types/conversion";

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit
export const MAX_FILE_SIZE_LABEL = "500 MB";

export const SUPPORTED_EXTENSIONS = [".mp4"];
export const SUPPORTED_MIME_TYPES = [
  "video/mp4",
  "video/x-m4v",
];

export interface FormatOption {
  value: OutputFormat;
  label: string;
  badge: string;
  ext: string;
  mime: string;
  description: string;
  isLossless?: boolean;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "mp3",
    label: "MP3",
    badge: "Universal",
    ext: ".mp3",
    mime: "audio/mpeg",
    description: "Universal compatibility across all devices and players",
  },
  {
    value: "wav",
    label: "WAV",
    badge: "Lossless Master",
    ext: ".wav",
    mime: "audio/wav",
    description: "Uncompressed 16-bit PCM studio audio, ideal for editing",
    isLossless: true,
  },
  {
    value: "flac",
    label: "FLAC",
    badge: "Lossless Hi-Fi",
    ext: ".flac",
    mime: "audio/flac",
    description: "Compressed lossless audio with full studio acoustic dynamic range",
    isLossless: true,
  },
  {
    value: "aac",
    label: "AAC (M4A)",
    badge: "Apple / Mobile",
    ext: ".m4a",
    mime: "audio/mp4",
    description: "Advanced Audio Coding optimized for Apple devices & YouTube",
  },
  {
    value: "ogg",
    label: "OGG (Vorbis)",
    badge: "Open Codec",
    ext: ".ogg",
    mime: "audio/ogg",
    description: "High-quality open-source Vorbis audio format for web & gaming",
  },
  {
    value: "opus",
    label: "OPUS",
    badge: "Next-Gen",
    ext: ".opus",
    mime: "audio/opus",
    description: "Modern ultra-efficient low-latency audio for speech and music",
  },
];

export function getFormatConfig(format: string): FormatOption {
  const match = FORMAT_OPTIONS.find((f) => f.value === format);
  return (
    match || {
      value: "mp3",
      label: "MP3",
      badge: "Universal",
      ext: ".mp3",
      mime: "audio/mpeg",
      description: "Universal compatibility across all devices and players",
    }
  );
}

export const BITRATE_OPTIONS: { value: AudioBitrate; label: string; description: string }[] = [
  { value: 96, label: "96 kbps", description: "Smaller file size, lower fidelity" },
  { value: 128, label: "128 kbps", description: "Standard basic quality" },
  { value: 192, label: "192 kbps (Recommended)", description: "Optimal balance of quality and size" },
  { value: 256, label: "256 kbps", description: "High quality audio" },
  { value: 320, label: "320 kbps (Best)", description: "Maximum supported fidelity" },
];

export const DEFAULT_BITRATE: AudioBitrate = 192;
export const DEFAULT_FORMAT: OutputFormat = "mp3";
