import { describe, expect, it } from "bun:test";
import {
  validateSelectedFile,
  isValidBitrate,
  conversionSettingsSchema,
} from "../src/lib/validation/converter";
import { formatBytes, formatDuration } from "../src/lib/utils";

describe("Converter File Validation", () => {
  it("rejects null or undefined files", () => {
    // @ts-expect-error testing null
    const res = validateSelectedFile(null);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("accepts valid MP4 files within size limit", () => {
    const mockFile = new File(["dummy content"], "sample_video.mp4", {
      type: "video/mp4",
    });
    const res = validateSelectedFile(mockFile);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("rejects non-MP4 files", () => {
    const mockFile = new File(["dummy content"], "sample_audio.mp3", {
      type: "audio/mpeg",
    });
    const res = validateSelectedFile(mockFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Please select an MP4 file");
  });

  it("rejects files exceeding 500MB", () => {
    const bigFile = new File([""], "huge_video.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(bigFile, "size", {
      value: 600 * 1024 * 1024, // 600 MB
    });
    const res = validateSelectedFile(bigFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("exceeds the 500 MB upload limit");
  });

  it("rejects empty files with 0 bytes", () => {
    const emptyFile = new File([], "empty.mp4", {
      type: "video/mp4",
    });
    const res = validateSelectedFile(emptyFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("empty");
  });
});

describe("Conversion Settings Schema", () => {
  it("validates supported bitrates", () => {
    expect(isValidBitrate(96)).toBe(true);
    expect(isValidBitrate(128)).toBe(true);
    expect(isValidBitrate(192)).toBe(true);
    expect(isValidBitrate(256)).toBe(true);
    expect(isValidBitrate(320)).toBe(true);
    expect(isValidBitrate(64)).toBe(false);
  });

  it("validates settings with zod schema", () => {
    const validMp3 = conversionSettingsSchema.safeParse({
      format: "mp3",
      bitrate: 192,
    });
    expect(validMp3.success).toBe(true);

    const validWav = conversionSettingsSchema.safeParse({
      format: "wav",
      bitrate: 192,
    });
    expect(validWav.success).toBe(true);

    const validFlac = conversionSettingsSchema.safeParse({
      format: "flac",
      bitrate: 320,
    });
    expect(validFlac.success).toBe(true);

    const invalidBitrate = conversionSettingsSchema.safeParse({
      format: "wav",
      bitrate: 500,
    });
    expect(invalidBitrate.success).toBe(false);

    const invalidFormat = conversionSettingsSchema.safeParse({
      format: "unsupported_codec",
      bitrate: 192,
    });
    expect(invalidFormat.success).toBe(false);
  });
});

describe("Format Utilities", () => {
  it("formats bytes accurately", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
  });

  it("formats duration accurately", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(184)).toBe("3:04");
  });
});
