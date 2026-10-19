import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { Upload } from "@/lib/db/models/Upload";
import { enqueueConversionJob } from "@/lib/queue/conversion-queue";
import { errorResponse } from "@/lib/errors";
import { isValidBitrate } from "@/lib/validation/converter";
import { env } from "@/lib/config/env";
import { cookies } from "next/headers";
import crypto from "crypto";
import { z } from "zod";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit/redis-limiter";

export const dynamic = "force-dynamic";

const createConversionSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  format: z.enum(["mp3", "wav", "flac", "aac", "ogg", "opus"]).optional().default("mp3"),
  bitrate: z.number().refine(isValidBitrate, "Invalid bitrate option"),
  trimStartSec: z.number().optional(),
  trimEndSec: z.number().optional(),
  normalizeAudio: z.boolean().optional().default(false),
  volumeMultiplier: z.number().min(0.25).max(3.0).optional().default(1.0),
  fadeInDurationSec: z.number().min(0).max(30).optional().default(0),
  fadeOutDurationSec: z.number().min(0).max(30).optional().default(0),
  playbackSpeed: z.number().min(0.5).max(2.0).optional().default(1.0),
  metadata: z
    .object({
      title: z.string().max(120).optional(),
      artist: z.string().max(120).optional(),
      album: z.string().max(120).optional(),
      year: z.string().max(10).optional(),
      genre: z.string().max(50).optional(),
      embedThumbnailArt: z.boolean().optional(),
    })
    .optional(),
  batchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit({
      key: `convert:${ip}`,
      limit: 30,
      windowSec: 600,
    });

    if (!rateCheck.allowed) {
      return rateLimitExceededResponse(rateCheck.retryAfterSec);
    }

    await connectDB();

    const cookieStore = cookies();
    let guestToken = cookieStore.get("mp4_guest_token")?.value;
    if (!guestToken) {
      guestToken = crypto.randomUUID();
    }
    const guestTokenHash = crypto.createHash("sha256").update(guestToken).digest("hex");

    const body = await req.json().catch(() => null);
    const parsed = createConversionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_FAILED",
        parsed.error.errors[0]?.message || "Invalid conversion parameters.",
        400
      );
    }

    const {
      uploadId,
      format,
      bitrate,
      trimStartSec,
      trimEndSec,
      normalizeAudio,
      volumeMultiplier,
      fadeInDurationSec,
      fadeOutDurationSec,
      playbackSpeed,
      metadata,
      batchId,
    } = parsed.data;

    // Idempotency support
    const metadataHash = metadata ? crypto.createHash("md5").update(JSON.stringify(metadata)).digest("hex").slice(0, 8) : "";
    const idempotencyKey =
      req.headers.get("idempotency-key") ||
      `idem_${uploadId}_${format}_${bitrate}_${trimStartSec || 0}_${trimEndSec || 0}_${normalizeAudio}_${volumeMultiplier}_${fadeInDurationSec}_${fadeOutDurationSec}_${playbackSpeed}_${metadataHash}`;

    // Check for existing job with same idempotency key and owner
    const existingJob = await ConversionJob.findOne({
      ownerId: guestTokenHash,
      idempotencyKey,
    });

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob._id.toString(),
        batchId: existingJob.batchId,
        status: existingJob.status,
        progress: existingJob.progressPercent,
        shareToken: existingJob.shareToken,
        message: "Existing conversion returned via idempotency key.",
      });
    }

    // Verify upload exists
    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return errorResponse(
        "NOT_FOUND",
        "The uploaded video was not found or has expired.",
        404
      );
    }

    const expiresAt = new Date(Date.now() + env.GUEST_RETENTION_HOURS * 3600 * 1000);
    const shareToken = crypto.randomBytes(16).toString("hex");

    // Create conversion job in MongoDB
    const job = await ConversionJob.create({
      ownerType: "guest",
      ownerId: guestTokenHash,
      guestTokenHash,
      batchId,
      uploadId: upload._id,
      originalFilename: upload.originalNameSafe,
      fileSizeBytes: upload.sizeBytes,
      status: "queued",
      shareToken,
      settings: {
        format,
        bitrateKbps: bitrate,
        trimStartSec,
        trimEndSec,
        normalizeAudio,
        volumeMultiplier,
        fadeInDurationSec,
        fadeOutDurationSec,
        playbackSpeed,
        metadata,
      },
      idempotencyKey,
      attempt: 1,
      progressPercent: 0,
      queuedAt: new Date(),
      expiresAt,
    });

    // Enqueue job in BullMQ
    await enqueueConversionJob(job._id.toString());

    const response = NextResponse.json({
      jobId: job._id.toString(),
      batchId: job.batchId,
      status: "queued",
      progress: 0,
    });

    // Set guest token cookie if new
    response.cookies.set("mp4_guest_token", guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Create conversion error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while scheduling the conversion.",
      500
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { getCurrentUser } = await import("@/lib/auth/session");
    const user = await getCurrentUser();

    let ownerId: string;
    if (user) {
      ownerId = user._id.toString();
    } else {
      const cookieStore = cookies();
      const guestToken = cookieStore.get("mp4_guest_token")?.value;
      if (!guestToken) {
        return NextResponse.json({ conversions: [] });
      }
      ownerId = crypto.createHash("sha256").update(guestToken).digest("hex");
    }

    const jobs = await ConversionJob.find({
      ownerId,
      deletedAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = jobs.map((job) => ({
      id: job._id.toString(),
      originalFilename: job.originalFilename,
      outputFilename:
        job.output?.filename ||
        `${job.originalFilename.replace(/\.[^/.]+$/, "")}.${job.settings.format || "mp3"}`,
      format: job.settings.format || "mp3",
      size: job.output?.sizeBytes || job.fileSizeBytes,
      duration: job.output?.durationSec || 0,
      bitrate: job.settings.bitrateKbps,
      status: job.status,
      createdAt: job.createdAt,
      downloadUrl:
        job.status === "completed"
          ? `/api/conversions/${job._id}/download`
          : undefined,
      previewUrl:
        job.status === "completed"
          ? `/api/conversions/${job._id}/preview`
          : undefined,
    }));

    return NextResponse.json({ conversions: formatted });
  } catch (err: unknown) {
    console.error("Fetch conversions error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to load conversion history.", 500);
  }
}

