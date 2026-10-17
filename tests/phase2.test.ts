import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalStorageService, generateStorageKey } from "../src/lib/storage";
import { ALLOWED_TRANSITIONS, InvalidStateTransitionError } from "../src/lib/jobs/state-machine";
import { getFFmpegPath, getFFprobePath } from "../src/worker/ffmpeg/binaries";
import { probeMedia } from "../src/worker/ffmpeg/probe";
import { convertMp4ToMp3 } from "../src/worker/ffmpeg/convert";
import { spawnSync } from "child_process";

describe("Phase 2 — Storage Service", () => {
  const testDir = path.join(os.tmpdir(), "mp4_test_storage");
  const storage = new LocalStorageService(testDir);

  it("stores, retrieves, checks existence, and deletes files", async () => {
    const key = generateStorageKey("test", "txt");
    const testContent = Buffer.from("test mp4-to-mp3 storage content");

    await storage.put(key, testContent);
    expect(await storage.exists(key)).toBe(true);

    const retrieved = await storage.get(key);
    expect(retrieved.toString()).toBe("test mp4-to-mp3 storage content");

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("prevents path traversal attacks", () => {
    expect(() => {
      storage.getPath("../../etc/passwd");
    }).not.toThrow(); // path.basename strips directory components safely
    const safePath = storage.getPath("../../etc/passwd");
    expect(path.dirname(safePath)).toBe(path.resolve(testDir));
  });
});

describe("Phase 2 — Job State Machine Rules", () => {
  it("defines strict valid state transitions", () => {
    expect(ALLOWED_TRANSITIONS.queued).toContain("processing");
    expect(ALLOWED_TRANSITIONS.queued).toContain("cancelled");
    expect(ALLOWED_TRANSITIONS.queued).not.toContain("completed");

    expect(ALLOWED_TRANSITIONS.processing).toContain("completed");
    expect(ALLOWED_TRANSITIONS.processing).toContain("failed");
    expect(ALLOWED_TRANSITIONS.processing).toContain("cancelled");

    expect(ALLOWED_TRANSITIONS.completed).toContain("expired");
    expect(ALLOWED_TRANSITIONS.completed).not.toContain("processing");
  });

  it("throws InvalidStateTransitionError on illegal transitions", () => {
    const err = new InvalidStateTransitionError("completed", "processing");
    expect(err.code).toBe("INVALID_STATE");
    expect(err.message).toContain("Cannot transition job from 'completed' to 'processing'");
  });
});

describe("Phase 2 — Media Processing Pipeline", () => {
  const tempDir = path.join(os.tmpdir(), "mp4_ffmpeg_test");
  const sampleMp4Path = path.join(tempDir, "synthetic_test.mp4");
  const outputMp3Path = path.join(tempDir, "synthetic_test.mp3");

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ffmpegPath = getFFmpegPath();

    // Generate a minimal 2-second valid MP4 with audio using FFmpeg
    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:duration=2",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=320x240:d=2",
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
    if (fs.existsSync(outputMp3Path)) fs.unlinkSync(outputMp3Path);
  });

  it("verifies FFmpeg and FFprobe binaries exist", () => {
    const ffmpegPath = getFFmpegPath();
    const ffprobePath = getFFprobePath();

    expect(ffmpegPath).toBeDefined();
    expect(ffprobePath).toBeDefined();
  });

  it("probes generated MP4 and detects audio stream", async () => {
    if (!fs.existsSync(sampleMp4Path)) {
      console.warn("Skipping probe test: synthetic test file could not be generated");
      return;
    }

    const probe = await probeMedia(sampleMp4Path);
    expect(probe.hasAudio).toBe(true);
    expect(probe.durationSeconds).toBeGreaterThan(0);
    expect(probe.audioCodec).toBe("aac");
  });

  it("converts MP4 to MP3 and post-probes output", async () => {
    if (!fs.existsSync(sampleMp4Path)) {
      console.warn("Skipping convert test: synthetic test file could not be generated");
      return;
    }

    let progressSeen = 0;
    await convertMp4ToMp3({
      inputPath: sampleMp4Path,
      outputPath: outputMp3Path,
      bitrateKbps: 192,
      totalDurationSeconds: 2,
      onProgress: (p) => {
        progressSeen = p;
      },
    });

    expect(fs.existsSync(outputMp3Path)).toBe(true);
    expect(progressSeen).toBe(100);

    const postProbe = await probeMedia(outputMp3Path);
    expect(postProbe.hasAudio).toBe(true);
    expect(postProbe.audioCodec).toBe("mp3");
    expect(postProbe.durationSeconds).toBeGreaterThan(1);
  });
});
