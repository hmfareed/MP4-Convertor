import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { Upload } from "@/lib/db/models/Upload";
import { getStorage, generateStorageKey } from "@/lib/storage";
import { probeMedia } from "@/worker/ffmpeg/probe";
import { errorResponse } from "@/lib/errors";
import { env } from "@/lib/config/env";
import { cookies } from "next/headers";
import crypto from "crypto";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit/redis-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit({
      key: `upload:${ip}`,
      limit: 25,
      windowSec: 600,
    });

    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.retryAfterSec);
    }

    await connectDB();

    // Guest identification
    const cookieStore = cookies();
    let guestToken = cookieStore.get("mp4_guest_token")?.value;
    if (!guestToken) {
      guestToken = crypto.randomUUID();
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid MP4 file.", 400);
    }

    const filename = (file as File).name || "video.mp4";
    const lowerName = filename.toLowerCase();

    if (!lowerName.endsWith(".mp4")) {
      return errorResponse(
        "UNSUPPORTED_FILE_TYPE",
        "Only MP4 videos are supported. Please select an MP4 file.",
        415
      );
    }

    if (file.size <= 0) {
      return errorResponse("VALIDATION_FAILED", "The uploaded file is empty.", 400);
    }

    if (file.size > env.MAX_UPLOAD_BYTES) {
      return errorResponse(
        "FILE_TOO_LARGE",
        `File exceeds maximum upload size of ${Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        413,
        { maxBytes: env.MAX_UPLOAD_BYTES }
      );
    }

    // Save to private storage
    const storage = getStorage();
    const storageKey = generateStorageKey("upload", "mp4");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await storage.put(storageKey, buffer);
    const storedFilePath = storage.getPath(storageKey);

    // Initial probe inspection
    let probeResult;
    try {
      probeResult = await probeMedia(storedFilePath);
    } catch (probeErr) {
      // Clean up uploaded file on unreadable media
      await storage.delete(storageKey);
      return errorResponse(
        "CORRUPTED_MEDIA",
        `We couldn't read this video. Please ensure it is a valid MP4 file.`,
        422
      );
    }

    if (!probeResult.hasAudio) {
      await storage.delete(storageKey);
      return errorResponse(
        "NO_AUDIO_STREAM",
        "This video does not contain an audio track to extract.",
        422
      );
    }

    if (probeResult.durationSeconds > env.MAX_DURATION_SECONDS) {
      await storage.delete(storageKey);
      return errorResponse(
        "DURATION_TOO_LONG",
        `Video duration exceeds maximum limit of ${env.MAX_DURATION_SECONDS} seconds.`,
        422,
        { maxDurationSeconds: env.MAX_DURATION_SECONDS }
      );
    }

    // Create database upload record
    const expiresAt = new Date(Date.now() + env.GUEST_RETENTION_HOURS * 3600 * 1000);
    const guestTokenHash = crypto.createHash("sha256").update(guestToken).digest("hex");

    const upload = await Upload.create({
      ownerType: "guest",
      ownerId: guestTokenHash,
      guestTokenHash,
      storageKey,
      originalNameSafe: filename,
      sizeBytes: file.size,
      mimeDetected: file.type || "video/mp4",
      probe: {
        duration: probeResult.durationSeconds,
        codec: probeResult.audioCodec,
        channels: probeResult.channels,
        sampleRate: probeResult.sampleRate,
      },
      expiresAt,
    });

    const response = NextResponse.json({
      uploadId: upload._id.toString(),
      originalFilename: filename,
      fileSize: file.size,
      duration: probeResult.durationSeconds,
    });

    // Set guest cookie
    response.cookies.set("mp4_guest_token", guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Upload handler error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while processing the upload.",
      500
    );
  }
}
