import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const jobId = params.id;
    const job = await ConversionJob.findById(jobId);

    if (!job) {
      return errorResponse("NOT_FOUND", "Conversion job not found.", 404);
    }

    return NextResponse.json({
      id: job._id.toString(),
      status: job.status,
      progress: job.progressPercent,
      originalFilename: job.originalFilename,
      outputFilename: job.output?.filename,
      bitrate: job.settings.bitrateKbps,
      duration: job.output?.durationSec,
      fileSize: job.fileSizeBytes,
      outputSize: job.output?.sizeBytes,
      errorCode: job.errorCode,
      errorMessage: job.errorMessageSafe,
      downloadUrl:
        job.status === "completed"
          ? `/api/conversions/${job._id}/download`
          : undefined,
      previewUrl:
        job.status === "completed"
          ? `/api/conversions/${job._id}/preview`
          : undefined,
      createdAt: job.createdAt,
      completedAt: job.finishedAt,
      expiresAt: job.expiresAt,
    });
  } catch (err: unknown) {
    console.error("Get conversion status error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to retrieve conversion status.",
      500
    );
  }
}
