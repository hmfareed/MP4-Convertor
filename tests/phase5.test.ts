import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { getFFmpegPath } from "../src/worker/ffmpeg/binaries";
import { probeMedia } from "../src/worker/ffmpeg/probe";
import { convertMp4ToMp3 } from "../src/worker/ffmpeg/convert";
import { connectDB } from "../src/lib/db/connection";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { transitionJobState } from "../src/lib/jobs/state-machine";

describe("Phase 5 — Audio Trimming & Job Controls", () => {
  const tempDir = path.join(os.tmpdir(), "mp4_trim_test");
  const sampleMp4Path = path.join(tempDir, "trim_source.mp4");
  const trimmedMp3Path = path.join(tempDir, "trim_output.mp3");

  beforeAll(async () => {
    await connectDB();

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ffmpegPath = getFFmpegPath();

    // Generate a 5-second synthetic test MP4
    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:duration=5",
        "-f",
        "lavfi",
        "-i",
        "color=c=green:s=320x240:d=5",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        sampleMp4Path,
      ],
      { shell: false }
    );
  });

  afterAll(() => {
    if (fs.existsSync(sampleMp4Path)) fs.unlinkSync(sampleMp4Path);
    if (fs.existsSync(trimmedMp3Path)) fs.unlinkSync(trimmedMp3Path);
  });

  it("extracts and trims audio between start and end timestamps", async () => {
    if (!fs.existsSync(sampleMp4Path)) {
      console.warn("Skipping trim test: source video could not be generated");
      return;
    }

    // Trim segment between 1s and 3s (expected output duration ~ 2 seconds)
    await convertMp4ToMp3({
      inputPath: sampleMp4Path,
      outputPath: trimmedMp3Path,
      bitrateKbps: 128,
      trimStartSec: 1,
      trimEndSec: 3,
      totalDurationSeconds: 2,
    });

    expect(fs.existsSync(trimmedMp3Path)).toBe(true);

    const postProbe = await probeMedia(trimmedMp3Path);
    expect(postProbe.hasAudio).toBe(true);
    expect(postProbe.audioCodec).toBe("mp3");
    expect(postProbe.durationSeconds).toBeGreaterThan(1.5);
    expect(postProbe.durationSeconds).toBeLessThan(2.5);
  });

  it("handles retry state transition from failed to queued", async () => {
    const dummyJob = await ConversionJob.create({
      ownerType: "guest",
      ownerId: "guest_retry_test",
      uploadId: "507f191e810c19729de860ea",
      originalFilename: "retry_test.mp4",
      fileSizeBytes: 1024,
      status: "failed",
      settings: { bitrateKbps: 192 },
      attempt: 1,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    const retried = await transitionJobState(
      dummyJob._id.toString(),
      ["failed", "cancelled"],
      "queued",
      {
        attempt: 2,
        progressPercent: 0,
      }
    );

    expect(retried).toBeDefined();
    expect(retried!.status).toBe("queued");
    expect(retried!.attempt).toBe(2);

    await ConversionJob.deleteOne({ _id: dummyJob._id });
  });
});
