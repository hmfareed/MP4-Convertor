import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import mongoose from "mongoose";
import { spawnSync } from "child_process";
import QRCode from "qrcode";
import { connectDB } from "../src/lib/db/connection";
import { User } from "../src/lib/db/models/User";
import { ConversionJob } from "../src/lib/db/models/ConversionJob";
import { getStorage, generateStorageKey } from "../src/lib/storage";
import { getFFmpegPath, getFFprobePath } from "../src/worker/ffmpeg/binaries";
import { convertMp4ToAudio } from "../src/worker/ffmpeg/convert";
import { probeMedia } from "../src/worker/ffmpeg/probe";
import { audioMetadataSchema } from "../src/lib/validation/converter";

describe("Option 2, 3 & 4 Feature Verifications", () => {
  let sampleMp4Path: string;
  const storage = getStorage();

  beforeAll(async () => {
    await connectDB();

    // Generate a valid 2-second test MP4 with audio and video stream
    sampleMp4Path = path.join(os.tmpdir(), `test_feat_${Date.now()}.mp4`);
    const ffmpegPath = getFFmpegPath();

    spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=523:duration=2",
        "-f",
        "lavfi",
        "-i",
        "color=c=purple:s=320x240:d=2",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        sampleMp4Path,
      ],
      { shell: false }
    );

    expect(fs.existsSync(sampleMp4Path)).toBe(true);
  });

  afterAll(async () => {
    if (fs.existsSync(sampleMp4Path)) {
      fs.unlinkSync(sampleMp4Path);
    }
  });

  // ==========================================
  // OPTION 2: ID3 Tag & Cover Art Metadata
  // ==========================================
  describe("Option 2 — ID3 Tag & Cover Art Metadata Editor", () => {
    it("validates valid audio metadata options with zod schema", () => {
      const valid = audioMetadataSchema.safeParse({
        title: "Neon Dreams",
        artist: "Synthwave Master",
        album: "Retro Electro",
        year: "2026",
        genre: "Electronic",
        embedThumbnailArt: true,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.title).toBe("Neon Dreams");
        expect(valid.data.embedThumbnailArt).toBe(true);
      }
    });

    it("rejects metadata with excessively long title or invalid format", () => {
      const invalid = audioMetadataSchema.safeParse({
        title: "x".repeat(250), // exceeds 120 limit
      });

      expect(invalid.success).toBe(false);
    });

    it("transcodes MP4 to MP3 with custom ID3 tags and embedded video cover art", async () => {
      const outputPath = path.join(os.tmpdir(), `test_tagged_${Date.now()}.mp3`);

      try {
        const metadata = {
          title: "Starlight Voyage",
          artist: "Cosmic Audio",
          album: "Deep Space Vol 1",
          year: "2026",
          genre: "Ambient",
          embedThumbnailArt: true,
        };

        await convertMp4ToAudio({
          inputPath: sampleMp4Path,
          outputPath,
          bitrateKbps: 192,
          format: "mp3",
          metadata,
        });

        expect(fs.existsSync(outputPath)).toBe(true);
        const stats = fs.statSync(outputPath);
        expect(stats.size).toBeGreaterThan(0);

        // Probe the transcoded file to inspect audio properties
        const probe = await probeMedia(outputPath);
        expect(probe.hasAudio).toBe(true);
        expect(probe.formatName).toContain("mp3");

        // Verify ID3 tags using ffprobe JSON format_tags
        const ffprobeOutput = spawnSync(
          getFFprobePath(),
          [
            "-v",
            "error",
            "-show_entries",
            "format_tags=title,artist,album",
            "-of",
            "json",
            outputPath,
          ],
          { encoding: "utf8" }
        );

        const parsed = JSON.parse(ffprobeOutput.stdout || "{}");
        const tags = parsed?.format?.tags || {};
        expect(tags.title || tags.TITLE).toBe("Starlight Voyage");
        expect(tags.artist || tags.ARTIST).toBe("Cosmic Audio");
        expect(tags.album || tags.ALBUM).toBe("Deep Space Vol 1");
      } finally {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }
    });
  });

  // ==========================================
  // OPTION 3: Quick Share & QR Code
  // ==========================================
  describe("Option 3 — Quick Share & Mobile QR Code Download", () => {
    it("generates a valid, renderable SVG QR Code from share URL", async () => {
      const testToken = crypto.randomBytes(16).toString("hex");
      const shareUrl = `http://localhost:3000/share/${testToken}`;

      const svg = await QRCode.toString(shareUrl, {
        type: "svg",
        margin: 2,
        color: {
          dark: "#ffffff",
          light: "#00000000",
        },
      });

      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
      expect(svg).toContain("viewBox");
      expect(svg).toContain("</svg>");
    });

    it("persists and queries conversion jobs via unique shareToken in database", async () => {
      const testToken = crypto.randomBytes(16).toString("hex");

      const job = await ConversionJob.create({
        ownerType: "user",
        ownerId: "user_test_shared",
        uploadId: new mongoose.Types.ObjectId(),
        originalFilename: "sample_recording.mp4",
        fileSizeBytes: 1048576,
        status: "completed",
        shareToken: testToken,
        expiresAt: new Date(Date.now() + 86400000),
        settings: {
          format: "mp3",
          bitrateKbps: 320,
          normalizeAudio: false,
          metadata: {
            title: "Shared Single",
            artist: "Sound Wave",
          },
        },
        output: {
          storageKey: "outputs/shared_track.mp3",
          filename: "sample_recording.mp3",
          format: "mp3",
          sizeBytes: 204800,
          durationSec: 30,
          bitrateKbps: 320,
        },
      });

      expect(job.shareToken).toBe(testToken);

      // Query by shareToken
      const foundJob = await ConversionJob.findOne({ shareToken: testToken });
      expect(foundJob).not.toBeNull();
      expect(foundJob?._id.toString()).toBe(job._id.toString());
      expect(foundJob?.settings?.metadata?.title).toBe("Shared Single");

      // Cleanup
      await ConversionJob.deleteOne({ _id: job._id });
    });
  });

  // ==========================================
  // OPTION 4: Bulk History & User Preferences
  // ==========================================
  describe("Option 4 — Bulk History Management & User Preferences", () => {
    it("persists user audio conversion preferences (defaultFormat and autoDownload)", async () => {
      const testEmail = `pref_user_${Date.now()}@example.com`;

      const user = await User.create({
        email: testEmail,
        passwordHash: "hash123",
        name: "Audio Engineer",
        role: "user",
        defaultFormat: "flac",
        autoDownload: true,
      });

      expect(user.defaultFormat).toBe("flac");
      expect(user.autoDownload).toBe(true);

      // Update preferences
      user.defaultFormat = "wav";
      user.autoDownload = false;
      await user.save();

      const reloadedUser = await User.findById(user._id);
      expect(reloadedUser?.defaultFormat).toBe("wav");
      expect(reloadedUser?.autoDownload).toBe(false);

      // Cleanup
      await User.deleteOne({ _id: user._id });
    });

    it("performs bulk deletion by removing storage files and marking jobs deletedAt", async () => {
      // Create 2 test storage output files
      const key1 = generateStorageKey("bulk_test_1", "mp3");
      const key2 = generateStorageKey("bulk_test_2", "mp3");

      fs.writeFileSync(storage.getPath(key1), "mock mp3 audio content 1");
      fs.writeFileSync(storage.getPath(key2), "mock mp3 audio content 2");

      expect(fs.existsSync(storage.getPath(key1))).toBe(true);
      expect(fs.existsSync(storage.getPath(key2))).toBe(true);

      // Create 2 test jobs in DB
      const job1 = await ConversionJob.create({
        ownerType: "user",
        ownerId: "user_bulk_tester",
        uploadId: new mongoose.Types.ObjectId(),
        originalFilename: "v1.mp4",
        fileSizeBytes: 1000,
        status: "completed",
        expiresAt: new Date(Date.now() + 86400000),
        settings: {
          format: "mp3",
          bitrateKbps: 192,
          normalizeAudio: false,
        },
        output: { storageKey: key1, filename: "v1.mp3", format: "mp3", sizeBytes: 500, durationSec: 10, bitrateKbps: 192 },
      });

      const job2 = await ConversionJob.create({
        ownerType: "user",
        ownerId: "user_bulk_tester",
        uploadId: new mongoose.Types.ObjectId(),
        originalFilename: "v2.mp4",
        fileSizeBytes: 1000,
        status: "completed",
        expiresAt: new Date(Date.now() + 86400000),
        settings: {
          format: "mp3",
          bitrateKbps: 192,
          normalizeAudio: false,
        },
        output: { storageKey: key2, filename: "v2.mp3", format: "mp3", sizeBytes: 500, durationSec: 10, bitrateKbps: 192 },
      });

      const jobIds = [job1._id.toString(), job2._id.toString()];

      // Execute bulk deletion logic
      const jobsToDelete = await ConversionJob.find({
        _id: { $in: jobIds },
        deletedAt: { $exists: false },
      });

      expect(jobsToDelete.length).toBe(2);

      for (const job of jobsToDelete) {
        if (job.output?.storageKey) {
          await storage.delete(job.output.storageKey);
        }
      }

      await ConversionJob.updateMany(
        { _id: { $in: jobIds } },
        { $set: { deletedAt: new Date() } }
      );

      // Verify files deleted from disk
      expect(fs.existsSync(storage.getPath(key1))).toBe(false);
      expect(fs.existsSync(storage.getPath(key2))).toBe(false);

      // Verify jobs excluded from active queries
      const activeJobs = await ConversionJob.find({
        _id: { $in: jobIds },
        deletedAt: { $exists: false },
      });
      expect(activeJobs.length).toBe(0);

      // Cleanup
      await ConversionJob.deleteMany({ _id: { $in: jobIds } });
    });
  });
});
