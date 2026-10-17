import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { transitionJobState } from "@/lib/jobs/state-machine";
import { enqueueConversionJob } from "@/lib/queue/conversion-queue";
import { env } from "@/lib/config/env";

export async function runStuckJobWatchdog(): Promise<void> {
  const timeoutMs = (env.CONVERSION_TIMEOUT_SECONDS + 60) * 1000;
  const cutoffTime = new Date(Date.now() - timeoutMs);

  try {
    const stuckJobs = await ConversionJob.find({
      status: "processing",
      startedAt: { $lt: cutoffTime },
    });

    if (stuckJobs.length === 0) return;

    console.log(`[Watchdog] Found ${stuckJobs.length} stuck jobs exceeding timeout.`);

    for (const job of stuckJobs) {
      const jobId = job._id.toString();

      if ((job.attempt || 1) < 3) {
        console.warn(`[Watchdog] Recovering stuck job ${jobId} (re-queuing attempt ${job.attempt + 1})...`);
        const updated = await transitionJobState(jobId, "processing", "queued", {
          attempt: (job.attempt || 1) + 1,
          progressPercent: 0,
          queuedAt: new Date(),
          startedAt: undefined,
        });

        if (updated) {
          await enqueueConversionJob(jobId);
        }
      } else {
        console.warn(`[Watchdog] Failing permanently stuck job ${jobId} (attempts exhausted)...`);
        await transitionJobState(jobId, "processing", "failed", {
          errorCode: "CONVERSION_TIMEOUT",
          errorMessageSafe: "Processing timed out and maximum recovery attempts were reached.",
          finishedAt: new Date(),
        });
      }
    }
  } catch (err) {
    console.error("[Watchdog] Error during stuck-job scan:", err);
  }
}
