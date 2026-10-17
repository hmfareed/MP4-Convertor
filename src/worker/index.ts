import { Worker } from "bullmq";
import { connectDB } from "@/lib/db/connection";
import { getRedisConnection } from "@/lib/queue/redis";
import { CONVERSION_QUEUE_NAME, ConversionQueuePayload } from "@/lib/queue/conversion-queue";
import { processConversionJob } from "@/worker/processors/conversion";
import { runStuckJobWatchdog } from "@/worker/watchdog";
import { runRetentionCleanup } from "@/worker/cleanup";
import { env } from "@/lib/config/env";

async function startWorker() {
  console.log("=========================================");
  console.log("   MP4 to MP3 Conversion Worker Engine   ");
  console.log("=========================================");

  await connectDB();
  console.log("[Worker] Connected to MongoDB.");

  const redis = getRedisConnection();
  console.log("[Worker] Connected to Redis.");

  const worker = new Worker<ConversionQueuePayload>(
    CONVERSION_QUEUE_NAME,
    async (job) => {
      console.log(`[Worker] Received conversion job: ${job.data.jobId}`);
      await processConversionJob(job);
    },
    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.data.jobId} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.data?.jobId} failed:`, err.message);
  });

  console.log(`[Worker] Listening on queue '${CONVERSION_QUEUE_NAME}' with concurrency ${env.WORKER_CONCURRENCY}...`);

  // Periodic Watchdog for recovering or failing stuck jobs
  const watchdogInterval = setInterval(() => {
    runStuckJobWatchdog().catch((err) => console.error("[Watchdog] Scan failed:", err));
  }, 60000);

  // Periodic Privacy & Retention Cleanup (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    runRetentionCleanup()
      .then((res) => {
        if (res.inputsCleaned > 0 || res.outputsExpired > 0 || res.retriedTasks > 0) {
          console.log(`[Cleanup] Retention cycle finished:`, res);
        }
      })
      .catch((err) => console.error("[Cleanup] Retention scan failed:", err));
  }, 5 * 60 * 1000);

  // Run once on worker startup
  runRetentionCleanup().catch((err) => console.error("[Cleanup] Initial scan failed:", err));

  const shutdown = async () => {
    console.log("[Worker] Shutting down gracefully...");
    clearInterval(watchdogInterval);
    clearInterval(cleanupInterval);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
