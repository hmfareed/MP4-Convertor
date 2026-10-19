import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import { getFFmpegPath } from "@/worker/ffmpeg/binaries";
import { env } from "@/lib/config/env";
import { OutputFormat, AudioMetadata } from "@/types/conversion";

export interface AudioEnhancementOptions {
  normalizeAudio?: boolean;
  volumeMultiplier?: number;
  fadeInDurationSec?: number;
  fadeOutDurationSec?: number;
  playbackSpeed?: number;
}

export interface ConvertOptions extends AudioEnhancementOptions {
  inputPath: string;
  outputPath: string;
  format?: OutputFormat;
  bitrateKbps: number;
  threads?: number;
  timeoutSeconds?: number;
  totalDurationSeconds?: number;
  trimStartSec?: number;
  trimEndSec?: number;
  metadata?: AudioMetadata;
  onProgress?: (progressPercent: number) => void;
  checkCancelled?: () => Promise<boolean>;
}

export function buildAudioFilterArgs(
  options: AudioEnhancementOptions,
  effectiveDurationSeconds: number = 0
): string[] {
  const filters: string[] = [];

  // 1. Volume adjustment (multiplier: 1.0 = 100%, 1.5 = 150%, 0.5 = 50%)
  if (
    options.volumeMultiplier !== undefined &&
    options.volumeMultiplier !== 1.0 &&
    options.volumeMultiplier > 0
  ) {
    filters.push(`volume=${options.volumeMultiplier.toFixed(2)}`);
  }

  // 2. Loudness normalization according to EBU R128 standard
  if (options.normalizeAudio) {
    filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  }

  // 3. Playback speed / tempo adjustment (preserves pitch)
  const speed = options.playbackSpeed ?? 1.0;
  if (speed !== 1.0 && speed >= 0.5 && speed <= 2.0) {
    filters.push(`atempo=${speed.toFixed(2)}`);
  }

  // Calculate duration after speed scaling for accurate fade timings
  const scaledDuration =
    effectiveDurationSeconds > 0
      ? effectiveDurationSeconds / (speed > 0 ? speed : 1.0)
      : 0;

  // 4. Fade In
  if (options.fadeInDurationSec !== undefined && options.fadeInDurationSec > 0) {
    const fadeIn = Math.max(0.1, options.fadeInDurationSec);
    filters.push(`afade=t=in:ss=0:d=${fadeIn.toFixed(2)}`);
  }

  // 5. Fade Out
  if (
    options.fadeOutDurationSec !== undefined &&
    options.fadeOutDurationSec > 0 &&
    scaledDuration > options.fadeOutDurationSec
  ) {
    const fadeOutStart = Math.max(0, scaledDuration - options.fadeOutDurationSec);
    filters.push(
      `afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${options.fadeOutDurationSec.toFixed(2)}`
    );
  }

  if (filters.length === 0) {
    return [];
  }

  return ["-af", filters.join(",")];
}

export function getFfmpegAudioArgs(
  format: OutputFormat = "mp3",
  bitrateKbps: number = 192
): string[] {
  switch (format) {
    case "wav":
      // Lossless 16-bit uncompressed PCM
      return ["-c:a", "pcm_s16le"];
    case "flac":
      // Lossless compressed FLAC
      return ["-c:a", "flac"];
    case "aac":
      // AAC audio stream
      return ["-c:a", "aac", "-b:a", `${bitrateKbps}k`];
    case "ogg":
      // OGG Vorbis stream
      return ["-c:a", "libvorbis", "-b:a", `${bitrateKbps}k`];
    case "opus":
      // High-efficiency modern Opus
      return ["-c:a", "libopus", "-b:a", `${bitrateKbps}k`];
    case "mp3":
    default:
      // Standard LAME MP3
      return ["-c:a", "libmp3lame", "-b:a", `${bitrateKbps}k`];
  }
}

export async function convertMp4ToAudio(options: ConvertOptions): Promise<void> {
  const {
    inputPath,
    outputPath,
    format = "mp3",
    bitrateKbps,
    threads = env.FFMPEG_THREADS,
    timeoutSeconds = env.CONVERSION_TIMEOUT_SECONDS,
    totalDurationSeconds = 0,
    trimStartSec,
    trimEndSec,
    normalizeAudio,
    volumeMultiplier,
    fadeInDurationSec,
    fadeOutDurationSec,
    playbackSpeed,
    metadata,
    onProgress,
    checkCancelled,
  } = options;

  const ffmpegPath = getFFmpegPath();

  const args: string[] = ["-y", "-nostdin", "-protocol_whitelist", "file"];

  // Optional trim start (fast input seeking)
  if (trimStartSec !== undefined && trimStartSec > 0) {
    args.push("-ss", trimStartSec.toString());
  }

  // Input file
  args.push("-i", inputPath);

  // Compute effective audio duration (before tempo adjustment)
  let effectiveDuration = totalDurationSeconds;
  if (trimEndSec !== undefined && trimEndSec > 0) {
    effectiveDuration =
      trimStartSec !== undefined && trimStartSec > 0
        ? Math.max(0.1, trimEndSec - trimStartSec)
        : trimEndSec;
    args.push("-t", effectiveDuration.toString());
  }

  // Audio enhancements & filters
  const filterArgs = buildAudioFilterArgs(
    {
      normalizeAudio,
      volumeMultiplier,
      fadeInDurationSec,
      fadeOutDurationSec,
      playbackSpeed,
    },
    effectiveDuration
  );

  // Speed-adjusted duration for progress reporting
  const speed = playbackSpeed ?? 1.0;
  const targetOutputDuration =
    effectiveDuration > 0
      ? effectiveDuration / (speed > 0 ? speed : 1.0)
      : totalDurationSeconds;

  // Video stream mapping: Embed video frame as attached cover art or drop video (-vn)
  const embedCover =
    !!metadata?.embedThumbnailArt && (format === "mp3" || format === "flac");

  if (embedCover) {
    args.push(
      "-map",
      "0:a",
      "-map",
      "0:v",
      "-c:v",
      "mjpeg",
      "-frames:v",
      "1",
      "-id3v2_version",
      "3",
      "-metadata:s:v",
      "title=Album cover",
      "-metadata:s:v",
      "comment=Cover (front)",
      "-disposition:v",
      "attached_pic"
    );
  } else {
    args.push("-vn");
  }

  // Audio Codec and Bitrate
  const audioArgs = getFfmpegAudioArgs(format, bitrateKbps);
  args.push(...audioArgs);

  // Audio Filters
  args.push(...filterArgs);

  // ID3 / Container Metadata Tags
  if (metadata?.title) {
    args.push("-metadata", `title=${metadata.title}`);
  }
  if (metadata?.artist) {
    args.push("-metadata", `artist=${metadata.artist}`);
  }
  if (metadata?.album) {
    args.push("-metadata", `album=${metadata.album}`);
  }
  if (metadata?.year) {
    args.push("-metadata", `date=${metadata.year}`);
  }
  if (metadata?.genre) {
    args.push("-metadata", `genre=${metadata.genre}`);
  }

  args.push(
    "-threads",
    threads.toString(),
    "-progress",
    "pipe:1",
    outputPath
  );

  return new Promise((resolve, reject) => {
    let proc: ChildProcess | null = spawn(ffmpegPath, args, {
      shell: false,
      windowsHide: true,
    });

    let stderrData = "";
    let isFinished = false;

    // Timeout watchdog
    const timeoutTimer = setTimeout(() => {
      if (!isFinished && proc) {
        proc.kill("SIGKILL");
        reject(
          new Error("CONVERSION_TIMEOUT: FFmpeg processing exceeded time limit.")
        );
      }
    }, timeoutSeconds * 1000);

    let cancellationInterval: NodeJS.Timeout | undefined;
    if (checkCancelled) {
      cancellationInterval = setInterval(async () => {
        try {
          if (await checkCancelled()) {
            if (proc && !isFinished) {
              proc.kill("SIGKILL");
              if (cancellationInterval) clearInterval(cancellationInterval);
              reject(new Error("CONVERSION_CANCELLED"));
            }
          }
        } catch {
          // ignore
        }
      }, 2000);
    }

    // Process progress output
    let lineBuffer = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("out_time_us=")) {
          const us = parseInt(trimmed.split("=")[1], 10);
          if (!isNaN(us) && targetOutputDuration > 0) {
            const currentSeconds = us / 1000000;
            const percent = Math.min(
              99,
              Math.max(
                1,
                Math.round((currentSeconds / targetOutputDuration) * 100)
              )
            );
            onProgress?.(percent);
          }
        } else if (trimmed.startsWith("out_time_ms=")) {
          const ms = parseInt(trimmed.split("=")[1], 10);
          if (!isNaN(ms) && targetOutputDuration > 0) {
            const currentSeconds = ms / 1000;
            const percent = Math.min(
              99,
              Math.max(
                1,
                Math.round((currentSeconds / targetOutputDuration) * 100)
              )
            );
            onProgress?.(percent);
          }
        }
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString();
    });

    proc.on("close", (code) => {
      isFinished = true;
      clearTimeout(timeoutTimer);
      if (cancellationInterval) clearInterval(cancellationInterval);
      proc = null;

      if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        // Cleanup partial output
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch {
            // ignore
          }
        }
        reject(
          new Error(
            `FFmpeg failed with exit code ${code}. Stderr: ${stderrData.slice(
              -500
            )}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      isFinished = true;
      clearTimeout(timeoutTimer);
      if (cancellationInterval) clearInterval(cancellationInterval);
      proc = null;
      reject(err);
    });
  });
}

// Backward compatible alias
export const convertMp4ToMp3 = (options: ConvertOptions) =>
  convertMp4ToAudio({ ...options, format: "mp3" });
