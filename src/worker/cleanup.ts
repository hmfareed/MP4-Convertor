import { connectDB } from "@/lib/db/connection";
import { Upload } from "@/lib/db/models/Upload";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { CleanupTask } from "@/lib/db/models/CleanupTask";
import { getStorage } from "@/lib/storage";
import { transitionJobState } from "@/lib/jobs/state-machine";

export interface CleanupResult {
  inputsCleaned: number;
  outputsExpired: number;
  retriedTasks: number;
}

export async function runRetentionCleanup(): Promise<CleanupResult> {
  await connectDB();
  const storage = getStorage();
  const now = new Date();

  let inputsCleaned = 0;
  let outputsExpired = 0;
  let retriedTasks = 0;

  // 1. Clean up expired uploads
  try {
    const expiredUploads = await Upload.find({ expiresAt: { $lte: now } }).limit(50);
    for (const upload of expiredUploads) {
      try {
        if (upload.storageKey) {
          await storage.delete(upload.storageKey);
        }
        await Upload.findByIdAndDelete(upload._id);
        inputsCleaned++;
      } catch (err: any) {
        console.error(`[Cleanup] Error deleting upload file ${upload.storageKey}:`, err);
        await CleanupTask.create({
          storageKey: upload.storageKey,
          targetType: "input",
          attempt: 1,
          lastError: err?.message || String(err),
          nextAttemptAt: new Date(Date.now() + 60000),
        });
      }
    }
  } catch (err) {
    console.error("[Cleanup] Failed during expired uploads scan:", err);
  }

  // 2. Clean up input MP4s for completed or failed jobs older than 1 hour (Privacy & Storage optimization)
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const finishedJobs = await ConversionJob.find({
      status: { $in: ["completed", "failed", "cancelled"] },
      finishedAt: { $lte: oneHourAgo },
      uploadId: { $exists: true, $ne: null },
    })
      .limit(50)
      .populate("uploadId");

    for (const job of finishedJobs) {
      if (job.uploadId && typeof job.uploadId === "object" && "storageKey" in job.uploadId) {
        const uploadDoc = job.uploadId as any;
        if (uploadDoc.storageKey) {
          try {
            await storage.delete(uploadDoc.storageKey);
            await Upload.findByIdAndDelete(uploadDoc._id);
            inputsCleaned++;
          } catch (err: any) {
            console.warn(`[Cleanup] Could not delete finished job input ${uploadDoc.storageKey}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Cleanup] Failed during completed job input scan:", err);
  }

  // 3. Clean up expired conversion outputs (MP3s)
  try {
    const expiredJobs = await ConversionJob.find({
      status: "completed",
      expiresAt: { $lte: now },
    }).limit(50);

    for (const job of expiredJobs) {
      if (job.output?.storageKey) {
        try {
          await storage.delete(job.output.storageKey);
        } catch (err: any) {
          console.error(`[Cleanup] Error deleting output file ${job.output.storageKey}:`, err);
          await CleanupTask.create({
            storageKey: job.output.storageKey,
            targetType: "output",
            attempt: 1,
            lastError: err?.message || String(err),
            nextAttemptAt: new Date(Date.now() + 60000),
          });
        }
      }

      await transitionJobState(job._id.toString(), "completed", "expired");
      outputsExpired++;
    }
  } catch (err) {
    console.error("[Cleanup] Failed during expired jobs scan:", err);
  }

  // 4. Retry pending failed CleanupTasks with exponential backoff
  try {
    const pendingTasks = await CleanupTask.find({
      status: "pending",
      nextAttemptAt: { $lte: now },
    }).limit(30);

    for (const task of pendingTasks) {
      task.attempt += 1;
      try {
        await storage.delete(task.storageKey);
        task.status = "completed";
      } catch (err: any) {
        task.lastError = err?.message || String(err);
        if (task.attempt >= task.maxAttempts) {
          task.status = "failed";
        } else {
          // Exponential backoff: 2^attempt minutes
          const backoffMinutes = Math.pow(2, task.attempt);
          task.nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        }
      }
      await task.save();
      retriedTasks++;
    }
  } catch (err) {
    console.error("[Cleanup] Failed during cleanup task retry scan:", err);
  }

  return { inputsCleaned, outputsExpired, retriedTasks };
}
