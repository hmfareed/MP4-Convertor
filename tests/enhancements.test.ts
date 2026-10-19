import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { conversionSettingsSchema } from "../src/lib/validation/converter";
import {
  buildAudioFilterArgs,
  convertMp4ToAudio,
} from "../src/worker/ffmpeg/convert";
import { getFFmpegPath } from "../src/worker/ffmpeg/binaries";
import { probeMedia } from "../src/worker/ffmpeg/probe";

describe("Audio Studio & Enhancement Filter Chain Builder", () => {
  it("returns empty array when all enhancements are disabled or at defaults", () => {
    const empty1 = buildAudioFilterArgs({});
    expect(empty1).toEqual([]);

    const empty2 = buildAudioFilterArgs({
      volumeMultiplier: 1.0,
      playbackSpeed: 1.0,
      normalizeAudio: false,
      fadeInDurationSec: 0,
      fadeOutDurationSec: 0,
    });
    expect(empty2).toEqual([]);
  });

  it("generates correct volume gain filter argument", () => {
    const res = buildAudioFilterArgs({ volumeMultiplier: 1.5 });
    expect(res).toEqual(["-af", "volume=1.50"]);

    const resQuiet = buildAudioFilterArgs({ volumeMultiplier: 0.75 });
    expect(resQuiet).toEqual(["-af", "volume=0.75"]);
  });

  it("generates correct EBU R128 loudness normalization filter argument", () => {
    const res = buildAudioFilterArgs({ normalizeAudio: true });
    expect(res).toEqual(["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"]);
  });

  it("generates correct pitch-preserved atempo speed filter", () => {
    const resFast = buildAudioFilterArgs({ playbackSpeed: 1.25 });
    expect(resFast).toEqual(["-af", "atempo=1.25"]);

    const resSlow = buildAudioFilterArgs({ playbackSpeed: 0.8 });
    expect(resSlow).toEqual(["-af", "atempo=0.80"]);
  });

  it("generates correct fade in and fade out filters with calculated timings", () => {
    // 30 seconds track, 3s fade in, 4s fade out -> fade out starts at 26s
    const res = buildAudioFilterArgs(
      {
        fadeInDurationSec: 3,
        fadeOutDurationSec: 4,
      },
      30
    );
    expect(res).toEqual([
      "-af",
      "afade=t=in:ss=0:d=3.00,afade=t=out:st=26.00:d=4.00",
    ]);
  });

  it("accurately adjusts fade out start position when tempo speed is altered", () => {
    // 30 seconds track at 1.5x speed -> output duration is 20s.
    // 3s fade out should start at 17s (20 - 3)
    const res = buildAudioFilterArgs(
      {
        playbackSpeed: 1.5,
        fadeOutDurationSec: 3,
      },
      30
    );
    expect(res).toEqual([
      "-af",
      "atempo=1.50,afade=t=out:st=17.00:d=3.00",
    ]);
  });

  it("combines multiple studio filters in sequence", () => {
    const res = buildAudioFilterArgs(
      {
        volumeMultiplier: 1.2,
        normalizeAudio: true,
        playbackSpeed: 1.25,
        fadeInDurationSec: 2,
        fadeOutDurationSec: 2,
      },
      25
    );

    expect(res[0]).toBe("-af");
    const filterString = res[1];
    expect(filterString).toContain("volume=1.20");
    expect(filterString).toContain("loudnorm=I=-16:TP=-1.5:LRA=11");
    expect(filterString).toContain("atempo=1.25");
    expect(filterString).toContain("afade=t=in:ss=0:d=2.00");
    expect(filterString).toContain("afade=t=out:");
  });
});

describe("Audio Enhancement Validation Schema", () => {
  it("validates valid enhancement options", () => {
    const result = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
      normalizeAudio: true,
      volumeMultiplier: 1.5,
      fadeInDurationSec: 2,
      fadeOutDurationSec: 3,
      playbackSpeed: 1.25,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.normalizeAudio).toBe(true);
      expect(result.data.volumeMultiplier).toBe(1.5);
      expect(result.data.playbackSpeed).toBe(1.25);
    }
  });

  it("rejects invalid volume multipliers outside allowed limits", () => {
    const low = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
      volumeMultiplier: 0.1, // below 0.25
    });
    expect(low.success).toBe(false);

    const high = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
      volumeMultiplier: 5.0, // above 3.0
    });
    expect(high.success).toBe(false);
  });

  it("rejects invalid playback speeds outside allowed limits", () => {
    const low = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
      playbackSpeed: 0.2, // below 0.5
    });
    expect(low.success).toBe(false);

    const high = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
      playbackSpeed: 3.0, // above 2.0
    });
    expect(high.success).toBe(false);
  });
});

describe("FFmpeg Studio Transcoding Integration", () => {
  const tempDir = path.join(os.tmpdir(), "enhancement_test_storage");
  const sampleMp4Path = path.join(tempDir, "enhancement_input.mp4");

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ffmpegPath = getFFmpegPath();

    // Generate minimal 3.0-second test MP4 with 440Hz sine tone
    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=3.0",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=160x120:d=3.0",
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
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("transcodes MP4 to MP3 with Volume Boost and Loudness Normalization", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "boosted_normalized.mp3");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "mp3",
      bitrateKbps: 192,
      volumeMultiplier: 1.5,
      normalizeAudio: true,
      totalDurationSeconds: 3.0,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.formatName).toContain("mp3");
    expect(probe.durationSeconds).toBeGreaterThan(2.0);
  });

  it("transcodes MP4 to WAV with 1.5x tempo speedup and Fade Transitions", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "tempo_faded.wav");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "wav",
      bitrateKbps: 192,
      playbackSpeed: 1.5,
      fadeInDurationSec: 0.5,
      fadeOutDurationSec: 0.5,
      totalDurationSeconds: 3.0,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.formatName).toContain("wav");
    // Original 3s at 1.5x should be roughly ~2.0s
    expect(probe.durationSeconds).toBeLessThan(2.5);
    expect(probe.durationSeconds).toBeGreaterThan(1.5);
  });
});
