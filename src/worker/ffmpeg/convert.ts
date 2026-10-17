import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import { getFFmpegPath } from "@/worker/ffmpeg/binaries";
import { env } from "@/lib/config/env";

export interface ConvertOptions {
  inputPath: string;
  outputPath: string;
  bitrateKbps: number;
  threads?: number;
  timeoutSeconds?: number;
  totalDurationSeconds?: number;
  trimStartSec?: number;
  trimEndSec?: number;
  onProgress?: (progressPercent: number) => void;
  checkCancelled?: () => Promise<boolean>;
}

export async function convertMp4ToMp3(options: ConvertOptions): Promise<void> {
  const {
    inputPath,
    outputPath,
    bitrateKbps,
    threads = env.FFMPEG_THREADS,
    timeoutSeconds = env.CONVERSION_TIMEOUT_SECONDS,
    totalDurationSeconds = 0,
    trimStartSec,
    trimEndSec,
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

  // Optional trim duration
  if (trimEndSec !== undefined && trimEndSec > 0) {
    const duration = trimStartSec !== undefined && trimStartSec > 0
      ? Math.max(0.1, trimEndSec - trimStartSec)
      : trimEndSec;
    args.push("-t", duration.toString());
  }

  // Encoding params: drop video, use LAME MP3 encoder, set target bitrate, set thread limit
  args.push(
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    `${bitrateKbps}k`,
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
        reject(new Error("CONVERSION_TIMEOUT: FFmpeg processing exceeded time limit."));
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
          if (!isNaN(us) && totalDurationSeconds > 0) {
            const currentSeconds = us / 1000000;
            const percent = Math.min(
              99,
              Math.max(1, Math.round((currentSeconds / totalDurationSeconds) * 100))
            );
            onProgress?.(percent);
          }
        } else if (trimmed.startsWith("out_time_ms=")) {
          const ms = parseInt(trimmed.split("=")[1], 10);
          if (!isNaN(ms) && totalDurationSeconds > 0) {
            const currentSeconds = ms / 1000;
            const percent = Math.min(
              99,
              Math.max(1, Math.round((currentSeconds / totalDurationSeconds) * 100))
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
        reject(new Error(`FFmpeg failed with exit code ${code}. Stderr: ${stderrData.slice(-500)}`));
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
