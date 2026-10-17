import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { connectDB } from "../src/lib/db/connection";
import { checkRateLimit, rateLimitExceededResponse } from "../src/lib/rate-limit/redis-limiter";
import { runRetentionCleanup } from "../src/worker/cleanup";
import { Upload } from "../src/lib/db/models/Upload";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { CleanupTask } from "../src/lib/db/models/CleanupTask";
import { getStorage } from "../src/lib/storage";

describe("Phase 7 — Hardening, Privacy & Rate Limiting", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up test tasks
    await CleanupTask.deleteMany({ storageKey: /test_key_/ });
  });

  it("enforces sliding-window rate limit and returns 429 when limit is reached", async () => {
    const testKey = `test_rate_${Date.now()}`;
    const limit = 3;
    const windowSec = 10;

    // Requests 1, 2, 3 should succeed
    const res1 = await checkRateLimit({ key: testKey, limit, windowSec });
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await checkRateLimit({ key: testKey, limit, windowSec });
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await checkRateLimit({ key: testKey, limit, windowSec });
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request must be rejected
    const res4 = await checkRateLimit({ key: testKey, limit, windowSec });
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSec).toBeGreaterThan(0);

    // Verify 429 response helper
    const response = rateLimitExceededResponse(res4.retryAfterSec);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(String(res4.retryAfterSec));
    const json = await response.json();
    expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("retention cleanup deletes expired uploads and storage files", async () => {
    const storage = getStorage();
    const storageKey = `test_upload_expired_${Date.now()}.mp4`;
    await storage.put(storageKey, Buffer.from("dummy video content"));
    expect(await storage.exists(storageKey)).toBe(true);

    // Create an expired Upload record
    const expiredUpload = await Upload.create({
      ownerType: "guest",
      ownerId: "guest_retention_test",
      storageKey,
      originalNameSafe: "expired.mp4",
      sizeBytes: 100,
      mimeDetected: "video/mp4",
      expiresAt: new Date(Date.now() - 10000), // in the past
    });

    const cleanupResult = await runRetentionCleanup();
    expect(cleanupResult.inputsCleaned).toBeGreaterThanOrEqual(1);

    // Verify storage file is removed
    expect(await storage.exists(storageKey)).toBe(false);

    // Verify Upload record is removed
    const found = await Upload.findById(expiredUpload._id);
    expect(found).toBeNull();
  });

  it("retention cleanup marks completed expired jobs as expired and deletes output", async () => {
    const storage = getStorage();
    const outputKey = `test_output_expired_${Date.now()}.mp3`;
    await storage.put(outputKey, Buffer.from("dummy mp3 audio content"));
    expect(await storage.exists(outputKey)).toBe(true);

    const expiredUpload = await Upload.create({
      ownerType: "guest",
      ownerId: "guest_job_test",
      storageKey: `dummy_input_${Date.now()}.mp4`,
      originalNameSafe: "input.mp4",
      sizeBytes: 100,
      mimeDetected: "video/mp4",
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Create completed conversion job expired in the past
    const job = await ConversionJob.create({
      ownerType: "guest",
      ownerId: "guest_job_test",
      uploadId: expiredUpload._id,
      originalFilename: "input.mp4",
      fileSizeBytes: 100,
      status: "completed",
      settings: { bitrateKbps: 192 },
      attempt: 1,
      progressPercent: 100,
      queuedAt: new Date(Date.now() - 20000),
      finishedAt: new Date(Date.now() - 10000),
      output: {
        storageKey: outputKey,
        filename: "input.mp3",
        sizeBytes: 50,
        durationSec: 5,
        bitrateKbps: 192,
      },
      expiresAt: new Date(Date.now() - 5000), // expired
    });

    await runRetentionCleanup();

    // Verify job transitioned to expired
    const updatedJob = await ConversionJob.findById(job._id);
    expect(updatedJob?.status).toBe("expired");

    // Verify MP3 file removed from disk
    expect(await storage.exists(outputKey)).toBe(false);

    // Clean up db
    await ConversionJob.findByIdAndDelete(job._id);
    await Upload.findByIdAndDelete(expiredUpload._id);
  });
});
