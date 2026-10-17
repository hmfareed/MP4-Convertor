import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/redis";

export const CONVERSION_QUEUE_NAME = "mp4-to-mp3-conversions";

export interface ConversionQueuePayload {
  jobId: string;
}

declare global {
  // eslint-disable-next-line no-var
  var bullConversionQueue: Queue<ConversionQueuePayload> | null;
}

let queueInstance = global.bullConversionQueue;

export function getConversionQueue(): Queue<ConversionQueuePayload> {
  if (!queueInstance) {
    queueInstance = new Queue<ConversionQueuePayload>(CONVERSION_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 1, // Retries are handled through the Job State Machine
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    if (process.env.NODE_ENV !== "production") {
      global.bullConversionQueue = queueInstance;
    }
  }

  return queueInstance;
}

export async function enqueueConversionJob(jobId: string): Promise<string> {
  const queue = getConversionQueue();
  const bullJob = await queue.add(
    "convert",
    { jobId },
    {
      jobId, // Pin BullMQ ID to MongoDB job ID for traceability
    }
  );
  return bullJob.id || jobId;
}
