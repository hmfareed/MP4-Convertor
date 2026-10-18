import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    await connectDB();
    const { batchId } = params;

    if (!batchId) {
      return errorResponse("VALIDATION_FAILED", "Batch ID is required.", 400);
    }

    const jobs = await ConversionJob.find({
      batchId,
      deletedAt: { $exists: false },
    }).sort({ createdAt: 1 });

    if (jobs.length === 0) {
      return errorResponse("NOT_FOUND", "No conversion jobs found for this batch.", 404);
    }

    const totalJobs = jobs.length;
    let completedCount = 0;
    let failedCount = 0;
    let totalProgressSum = 0;

    const formattedJobs = jobs.map((job) => {
      const isCompleted = job.status === "completed";
      const isFailed = job.status === "failed" || job.status === "cancelled";

      if (isCompleted) completedCount++;
      if (isFailed) failedCount++;

      // Use 100 for completed, progressPercent for active, 0 for queued/failed
      const progress = isCompleted ? 100 : job.progressPercent || 0;
      totalProgressSum += progress;

      return {
        id: job._id.toString(),
        batchId: job.batchId,
        originalFilename: job.originalFilename,
        outputFilename: job.output?.filename || `${job.originalFilename.replace(/\.[^/.]+$/, "")}.mp3`,
        fileSize: job.output?.sizeBytes || job.fileSizeBytes,
        duration: job.output?.durationSec || 0,
        bitrate: job.settings.bitrateKbps,
        status: job.status,
        progress,
        statusMessage: job.errorMessageSafe || (isCompleted ? "Completed" : undefined),
        createdAt: job.createdAt.toISOString(),
        completedAt: job.finishedAt ? job.finishedAt.toISOString() : undefined,
        error: job.errorMessageSafe,
        downloadUrl: isCompleted ? `/api/conversions/${job._id}/download` : undefined,
        audioUrl: isCompleted ? `/api/conversions/${job._id}/preview` : undefined,
      };
    });

    const overallProgress = Math.round(totalProgressSum / totalJobs);
    const isComplete = completedCount + failedCount === totalJobs;

    return NextResponse.json({
      batchId,
      totalJobs,
      completedCount,
      failedCount,
      activeCount: totalJobs - (completedCount + failedCount),
      overallProgress,
      isComplete,
      zipDownloadUrl: completedCount > 0 ? `/api/conversions/batch/${batchId}/download` : undefined,
      jobs: formattedJobs,
    });
  } catch (err: unknown) {
    console.error("Batch status query error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retrieve batch status.", 500);
  }
}
