import fs from "fs";
import path from "path";
import os from "os";
import { Job } from "bullmq";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { Upload } from "@/lib/db/models/Upload";
import { getStorage, generateStorageKey } from "@/lib/storage";
import { transitionJobState } from "@/lib/jobs/state-machine";
import { probeMedia } from "@/worker/ffmpeg/probe";
import { convertMp4ToAudio } from "@/worker/ffmpeg/convert";
import { getFormatConfig } from "@/lib/constants";
import { OutputFormat } from "@/types/conversion";
import { ConversionQueuePayload } from "@/lib/queue/conversion-queue";
import { env } from "@/lib/config/env";

export async function processConversionJob(job: Job<ConversionQueuePayload>): Promise<void> {
  const { jobId } = job.data;
  await connectDB();

  const conversionJob = await ConversionJob.findById(jobId);
  if (!conversionJob) {
    console.error(`[Worker] Job ${jobId} not found in database.`);
    return;
  }

  // Atomically transition from 'queued' to 'processing'
  const processingJob = await transitionJobState(jobId, "queued", "processing", {
    startedAt: new Date(),
    progressPercent: 1,
  });

  if (!processingJob) {
    console.warn(`[Worker] Job ${jobId} could not transition to processing (current status: ${conversionJob.status}).`);
    return;
  }

  const upload = await Upload.findById(processingJob.uploadId);
  if (!upload) {
    await transitionJobState(jobId, "processing", "failed", {
      errorCode: "NOT_FOUND",
      errorMessageSafe: "Source video upload not found or has been removed.",
      finishedAt: new Date(),
    });
    return;
  }

  const storage = getStorage();
  const inputFilePath = storage.getPath(upload.storageKey);

  if (!fs.existsSync(inputFilePath)) {
    await transitionJobState(jobId, "processing", "failed", {
      errorCode: "FILE_MISSING",
      errorMessageSafe: "Source media file is missing from storage.",
      finishedAt: new Date(),
    });
    return;
  }

  const tempOutputDir = path.join(os.tmpdir(), "mp4-to-mp3-conversions");
  if (!fs.existsSync(tempOutputDir)) {
    fs.mkdirSync(tempOutputDir, { recursive: true });
  }

  const targetFormat = (processingJob.settings.format || "mp3") as OutputFormat;
  const formatConfig = getFormatConfig(targetFormat);
  const extWithoutDot = formatConfig.ext.replace(/^\./, "");

  const tempOutputFilename = `temp_${jobId}_${Date.now()}${formatConfig.ext}`;
  const tempOutputPath = path.join(tempOutputDir, tempOutputFilename);

  const startTime = Date.now();

  try {
    // 1. Pre-probe input
    const preProbe = await probeMedia(inputFilePath);

    if (!preProbe.hasAudio) {
      throw new Error("NO_AUDIO_STREAM: The provided MP4 video does not contain an audio stream.");
    }

    if (preProbe.durationSeconds > env.MAX_DURATION_SECONDS) {
      throw new Error(`DURATION_TOO_LONG: Video duration exceeds the ${env.MAX_DURATION_SECONDS} seconds limit.`);
    }

    // 2. Convert to Target Audio Format
    await convertMp4ToAudio({
      inputPath: inputFilePath,
      outputPath: tempOutputPath,
      format: targetFormat,
      bitrateKbps: processingJob.settings.bitrateKbps,
      threads: env.FFMPEG_THREADS,
      timeoutSeconds: env.CONVERSION_TIMEOUT_SECONDS,
      totalDurationSeconds: preProbe.durationSeconds,
      trimStartSec: processingJob.settings.trimStartSec,
      trimEndSec: processingJob.settings.trimEndSec,
      normalizeAudio: processingJob.settings.normalizeAudio,
      volumeMultiplier: processingJob.settings.volumeMultiplier,
      fadeInDurationSec: processingJob.settings.fadeInDurationSec,
      fadeOutDurationSec: processingJob.settings.fadeOutDurationSec,
      playbackSpeed: processingJob.settings.playbackSpeed,
      metadata: processingJob.settings.metadata,
      onProgress: async (percent) => {
        try {
          await ConversionJob.updateOne(
            { _id: jobId, status: "processing" },
            { $set: { progressPercent: percent } }
          );
        } catch {
          // ignore progress update errors
        }
      },
      checkCancelled: async () => {
        const check = await ConversionJob.findById(jobId).select("cancelRequestedAt status");
        return !!check?.cancelRequestedAt || check?.status === "cancelled";
      },
    });

    // 3. Post-probe output
    const postProbe = await probeMedia(tempOutputPath);
    const outputStat = fs.statSync(tempOutputPath);

    if (outputStat.size <= 0) {
      throw new Error(`CORRUPTED_OUTPUT: Produced ${targetFormat.toUpperCase()} file is empty.`);
    }

    // 4. Move output to private storage
    const outputStorageKey = generateStorageKey("audio", extWithoutDot);
    const outputReadStream = fs.createReadStream(tempOutputPath);
    await storage.put(outputStorageKey, outputReadStream);

    const safeBaseName = processingJob.originalFilename.replace(/\.[^/.]+$/, "");
    const outputDisplayName = `${safeBaseName}${formatConfig.ext}`;

    // 5. Transition to completed
    await transitionJobState(jobId, "processing", "completed", {
      progressPercent: 100,
      finishedAt: new Date(),
      processingMs: Date.now() - startTime,
      output: {
        storageKey: outputStorageKey,
        filename: outputDisplayName,
        format: targetFormat,
        sizeBytes: outputStat.size,
        durationSec: postProbe.durationSeconds,
        bitrateKbps: processingJob.settings.bitrateKbps,
      },
    });

    console.log(`[Worker] Successfully converted job ${jobId} -> ${outputDisplayName}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[Worker] Conversion failed for job ${jobId}:`, error.message);

    let errorCode = "INTERNAL_ERROR";
    let errorMessageSafe = "An unexpected error occurred during audio extraction.";

    if (error.message.includes("NO_AUDIO_STREAM")) {
      errorCode = "NO_AUDIO_STREAM";
      errorMessageSafe = "This video does not contain an audio track.";
    } else if (error.message.includes("DURATION_TOO_LONG")) {
      errorCode = "DURATION_TOO_LONG";
      errorMessageSafe = "The media duration exceeds the maximum allowed limit.";
    } else if (error.message.includes("CONVERSION_TIMEOUT")) {
      errorCode = "CONVERSION_TIMEOUT";
      errorMessageSafe = "The conversion timed out before completing.";
    } else if (error.message.includes("CONVERSION_CANCELLED")) {
      errorCode = "CANCELLED";
      errorMessageSafe = "The conversion was cancelled by user request.";
    } else if (error.message.includes("CORRUPTED_MEDIA")) {
      errorCode = "CORRUPTED_MEDIA";
      errorMessageSafe = "The video file appears corrupted or unreadable.";
    }

    await transitionJobState(jobId, "processing", "failed", {
      errorCode,
      errorMessageSafe,
      finishedAt: new Date(),
      processingMs: Date.now() - startTime,
    });
  } finally {
    // Cleanup temporary output file
    if (fs.existsSync(tempOutputPath)) {
      try {
        fs.unlinkSync(tempOutputPath);
      } catch {
        // ignore
      }
    }
  }
}
