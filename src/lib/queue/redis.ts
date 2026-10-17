import Redis from "ioredis";
import { env } from "@/lib/config/env";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | null;
}

let redisInstance = global.redisClient;

export function getRedisConnection(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    redisInstance.on("error", (err) => {
      console.error("Redis Connection Error:", err.message);
    });

    if (process.env.NODE_ENV !== "production") {
      global.redisClient = redisInstance;
    }
  }

  return redisInstance;
}
