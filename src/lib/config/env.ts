import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/mp4tomp3"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SESSION_SECRET: z.string().default("mp4-to-mp3-dev-session-secret-change-me-in-production-32chars"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./data/storage"),
  FFMPEG_PATH: z.string().optional().default(""),
  FFPROBE_PATH: z.string().optional().default(""),
  MAX_UPLOAD_BYTES: z.coerce.number().default(500 * 1024 * 1024), // 500 MB
  MAX_DURATION_SECONDS: z.coerce.number().default(3600), // 1 hour
  CONVERSION_TIMEOUT_SECONDS: z.coerce.number().default(900), // 15 mins
  WORKER_CONCURRENCY: z.coerce.number().default(2),
  FFMPEG_THREADS: z.coerce.number().default(2),
  DEFAULT_BITRATE_KBPS: z.coerce.number().default(192),
  GUEST_RETENTION_HOURS: z.coerce.number().default(24),
  USER_RETENTION_HOURS: z.coerce.number().default(168),
  INPUT_RETENTION_MINUTES: z.coerce.number().default(60),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function getEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration. Check your .env file.");
  }
  return result.data;
}

export const env = getEnvConfig();
