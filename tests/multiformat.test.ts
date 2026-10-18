import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { FORMAT_OPTIONS, getFormatConfig } from "../src/lib/constants";
import { isValidFormat, SUPPORTED_AUDIO_FORMATS } from "../src/lib/validation/converter";
import {
  convertMp4ToAudio,
  convertMp4ToMp3,
  getFfmpegAudioArgs,
} from "../src/worker/ffmpeg/convert";
import { getFFmpegPath } from "../src/worker/ffmpeg/binaries";
import { probeMedia } from "../src/worker/ffmpeg/probe";
import { OutputFormat } from "../src/types/conversion";

describe("Multi-Format Audio Configuration & Validation", () => {
  it("supports all 6 primary audio formats", () => {
    expect(SUPPORTED_AUDIO_FORMATS).toEqual([
      "mp3",
      "wav",
      "flac",
      "aac",
      "ogg",
      "opus",
    ]);

    expect(isValidFormat("mp3")).toBe(true);
    expect(isValidFormat("wav")).toBe(true);
    expect(isValidFormat("flac")).toBe(true);
    expect(isValidFormat("aac")).toBe(true);
    expect(isValidFormat("ogg")).toBe(true);
    expect(isValidFormat("opus")).toBe(true);
    expect(isValidFormat("wma")).toBe(false);
  });

  it("provides complete metadata and MIME types for every format", () => {
    expect(FORMAT_OPTIONS).toHaveLength(6);

    const wavConfig = getFormatConfig("wav");
    expect(wavConfig.label).toBe("WAV");
    expect(wavConfig.ext).toBe(".wav");
    expect(wavConfig.mime).toBe("audio/wav");
    expect(wavConfig.isLossless).toBe(true);

    const flacConfig = getFormatConfig("flac");
    expect(flacConfig.label).toBe("FLAC");
    expect(flacConfig.ext).toBe(".flac");
    expect(flacConfig.mime).toBe("audio/flac");
    expect(flacConfig.isLossless).toBe(true);

    const aacConfig = getFormatConfig("aac");
    expect(aacConfig.label).toContain("AAC");
    expect(aacConfig.mime).toBe("audio/mp4");

    const fallbackConfig = getFormatConfig("unknown_xyz");
    expect(fallbackConfig.value).toBe("mp3");
  });

  it("generates correct FFmpeg audio arguments for each format", () => {
    expect(getFfmpegAudioArgs("wav")).toEqual(["-c:a", "pcm_s16le"]);
    expect(getFfmpegAudioArgs("flac")).toEqual(["-c:a", "flac"]);
    expect(getFfmpegAudioArgs("aac", 256)).toEqual(["-c:a", "aac", "-b:a", "256k"]);
    expect(getFfmpegAudioArgs("ogg", 192)).toEqual(["-c:a", "libvorbis", "-b:a", "192k"]);
    expect(getFfmpegAudioArgs("opus", 128)).toEqual(["-c:a", "libopus", "-b:a", "128k"]);
    expect(getFfmpegAudioArgs("mp3", 320)).toEqual(["-c:a", "libmp3lame", "-b:a", "320k"]);
  });
});

describe("Multi-Format FFmpeg Encoding Pipeline", () => {
  const tempDir = path.join(os.tmpdir(), "multiformat_test_storage");
  const sampleMp4Path = path.join(tempDir, "sample_input.mp4");

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ffmpegPath = getFFmpegPath();

    // Generate minimal 1.5-second test MP4 with tone
    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1.5",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=160x120:d=1.5",
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

  it("converts MP4 to lossless WAV format", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "output.wav");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "wav",
      bitrateKbps: 192,
      totalDurationSeconds: 1.5,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.audioCodec).toContain("pcm_s16le");
  });

  it("converts MP4 to lossless FLAC format", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "output.flac");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "flac",
      bitrateKbps: 192,
      totalDurationSeconds: 1.5,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.audioCodec).toBe("flac");
  });

  it("converts MP4 to high-efficiency AAC format", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "output.m4a");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "aac",
      bitrateKbps: 256,
      totalDurationSeconds: 1.5,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.audioCodec).toBe("aac");
  });

  it("converts MP4 to OGG Vorbis format", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "output.ogg");
    await convertMp4ToAudio({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      format: "ogg",
      bitrateKbps: 192,
      totalDurationSeconds: 1.5,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.audioCodec).toBe("vorbis");
  });

  it("retains convertMp4ToMp3 backwards compatibility", async () => {
    if (!fs.existsSync(sampleMp4Path)) return;

    const outPath = path.join(tempDir, "output.mp3");
    await convertMp4ToMp3({
      inputPath: sampleMp4Path,
      outputPath: outPath,
      bitrateKbps: 192,
      totalDurationSeconds: 1.5,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const probe = await probeMedia(outPath);
    expect(probe.hasAudio).toBe(true);
    expect(probe.audioCodec).toBe("mp3");
  });
});
