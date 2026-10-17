import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { connectDB } from "../src/lib/db/connection";
import { getRedisConnection } from "../src/lib/queue/redis";
import { Upload } from "../src/lib/db/models/Upload";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { getStorage, generateStorageKey } from "../src/lib/storage";
import { getFFmpegPath } from "../src/worker/ffmpeg/binaries";
import { processConversionJob } from "../src/worker/processors/conversion";
import { Job } from "bullmq";

describe("Phase 2 — End-to-End Conversion Pipeline", () => {
  let sampleMp4StorageKey: string;
  let testJobId: string;
  const storage = getStorage();

  beforeAll(async () => {
    await connectDB();
    const redis = getRedisConnection();
    await redis.ping();

    // 1. Generate a valid 2-second MP4 with video and audio track
    const tempMp4 = path.join(os.tmpdir(), `test_e2e_${Date.now()}.mp4`);
    const ffmpegPath = getFFmpegPath();

    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=320x240:d=2",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        tempMp4,
      ],
      { shell: false }
    );

    expect(fs.existsSync(tempMp4)).toBe(true);

    // 2. Put file in storage
    sampleMp4StorageKey = generateStorageKey("upload_e2e", "mp4");
    const stream = fs.createReadStream(tempMp4);
    await storage.put(sampleMp4StorageKey, stream);
    fs.unlinkSync(tempMp4);

    // 3. Create Upload in database
    const stat = fs.statSync(storage.getPath(sampleMp4StorageKey));
    const upload = await Upload.create({
      ownerType: "guest",
      ownerId: "guest_test_owner",
      storageKey: sampleMp4StorageKey,
      originalNameSafe: "sample_recording.mp4",
      sizeBytes: stat.size,
      mimeDetected: "video/mp4",
      probe: {
        duration: 2,
        codec: "aac",
        channels: 1,
        sampleRate: 44100,
      },
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    // 4. Create ConversionJob in database
    const convJob = await ConversionJob.create({
      ownerType: "guest",
      ownerId: "guest_test_owner",
      uploadId: upload._id,
      originalFilename: "sample_recording.mp4",
      fileSizeBytes: stat.size,
      status: "queued",
      settings: {
        bitrateKbps: 192,
      },
      idempotencyKey: `test_idem_${Date.now()}`,
      attempt: 1,
      progressPercent: 0,
      queuedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    testJobId = convJob._id.toString();
  });

  afterAll(async () => {
    // Cleanup storage & test records
    if (sampleMp4StorageKey) {
      await storage.delete(sampleMp4StorageKey);
    }
    if (testJobId) {
      const job = await ConversionJob.findById(testJobId);
      if (job?.output?.storageKey) {
        await storage.delete(job.output.storageKey);
      }
      await ConversionJob.deleteOne({ _id: testJobId });
    }
  });

  it("processes conversion job from queued to completed and produces valid MP3", async () => {
    const mockBullJob = {
      data: { jobId: testJobId },
    } as Job;

    await processConversionJob(mockBullJob);

    // Verify job in database
    const updatedJob = await ConversionJob.findById(testJobId);
    expect(updatedJob).toBeDefined();
    expect(updatedJob!.status).toBe("completed");
    expect(updatedJob!.progressPercent).toBe(100);
    expect(updatedJob!.output).toBeDefined();
    expect(updatedJob!.output!.filename).toBe("sample_recording.mp3");
    expect(updatedJob!.output!.bitrateKbps).toBe(192);
    expect(updatedJob!.output!.sizeBytes).toBeGreaterThan(0);
    expect(updatedJob!.output!.durationSec).toBeGreaterThan(1);

    // Verify file exists in storage
    const outputFilePath = storage.getPath(updatedJob!.output!.storageKey);
    expect(fs.existsSync(outputFilePath)).toBe(true);

    const outputStats = fs.statSync(outputFilePath);
    expect(outputStats.size).toBe(updatedJob!.output!.sizeBytes);
  });
});
