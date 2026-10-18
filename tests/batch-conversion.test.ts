import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { connectDB } from "../src/lib/db/connection";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { Upload } from "../src/lib/db/models/Upload";
import { getStorage } from "../src/lib/storage";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import mongoose from "mongoose";
import fs from "fs";

describe("Phase 8 — Batch Conversion & ZIP Download", () => {
  const batchId = `test_batch_${Date.now()}`;
  const uploadIds: mongoose.Types.ObjectId[] = [];
  const jobIds: string[] = [];
  const storageKeys: string[] = [];

  beforeAll(async () => {
    await connectDB();
    const storage = getStorage();

    // Create 3 dummy audio output files in storage
    for (let i = 1; i <= 3; i++) {
      const storageKey = `test_batch_output_${batchId}_${i}.mp3`;
      storageKeys.push(storageKey);
      await storage.put(storageKey, Buffer.from(`DUMMY MP3 AUDIO DATA CONTENT FOR TRACK ${i}`));

      const upload = await Upload.create({
        ownerType: "guest",
        ownerId: "test_batch_owner",
        storageKey: `upload_${storageKey}`,
        originalNameSafe: `recording_part_${i}.mp4`,
        sizeBytes: 1024 * 100,
        mimeDetected: "video/mp4",
        probe: { duration: 60, codec: "aac", channels: 2, sampleRate: 44100 },
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });
      uploadIds.push(upload._id as mongoose.Types.ObjectId);

      const job = await ConversionJob.create({
        ownerType: "guest",
        ownerId: "test_batch_owner",
        batchId,
        uploadId: upload._id,
        originalFilename: `recording_part_${i}.mp4`,
        fileSizeBytes: 1024 * 100,
        status: i === 3 ? "processing" : "completed",
        progressPercent: i === 3 ? 50 : 100,
        settings: { bitrateKbps: 192 },
        attempt: 1,
        output:
          i === 3
            ? undefined
            : {
                storageKey,
                filename: `recording_part_${i}.mp3`,
                sizeBytes: 1024 * 50,
                durationSec: 60,
                bitrateKbps: 192,
              },
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });
      jobIds.push(job._id.toString());
    }
  });

  afterAll(async () => {
    const storage = getStorage();
    for (const key of storageKeys) {
      await storage.delete(key).catch(() => {});
    }
    await Upload.deleteMany({ _id: { $in: uploadIds } });
    await ConversionJob.deleteMany({ batchId });
  });

  it("persists batchId across multiple jobs in MongoDB", async () => {
    const jobs = await ConversionJob.find({ batchId });
    expect(jobs.length).toBe(3);
    expect(jobs.every((j) => j.batchId === batchId)).toBe(true);
  });

  it("calculates accurate batch progress and completion status", async () => {
    const jobs = await ConversionJob.find({ batchId });
    const totalJobs = jobs.length;
    const completedCount = jobs.filter((j) => j.status === "completed").length;
    const activeCount = jobs.filter((j) => j.status === "processing" || j.status === "queued").length;

    expect(totalJobs).toBe(3);
    expect(completedCount).toBe(2);
    expect(activeCount).toBe(1);

    const progressSum = jobs.reduce((sum, j) => sum + (j.status === "completed" ? 100 : j.progressPercent), 0);
    const overallProgress = Math.round(progressSum / totalJobs);

    expect(overallProgress).toBe(83); // (100 + 100 + 50) / 3 = 83.33 -> 83
  });

  it("creates and streams a valid ZIP archive using ZipArchive with PK header magic bytes", async () => {
    const completedJobs = await ConversionJob.find({
      batchId,
      status: "completed",
      "output.storageKey": { $exists: true },
    });

    expect(completedJobs.length).toBe(2);

    const storage = getStorage();
    const passThrough = new PassThrough();
    const archive = new ZipArchive({ zlib: { level: 6 } });

    archive.pipe(passThrough);

    for (const job of completedJobs) {
      if (job.output?.storageKey) {
        const filePath = storage.getPath(job.output.storageKey);
        archive.file(filePath, { name: job.output.filename });
      }
    }

    archive.finalize();

    // Collect chunks from passThrough stream
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      passThrough.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      passThrough.on("end", () => resolve());
      passThrough.on("error", (err) => reject(err));
    });

    const zipBuffer = Buffer.concat(chunks);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Standard ZIP archive starts with magic signature 'PK\x03\x04' (0x50, 0x4B, 0x03, 0x04)
    expect(zipBuffer[0]).toBe(0x50); // 'P'
    expect(zipBuffer[1]).toBe(0x4b); // 'K'
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });
});
