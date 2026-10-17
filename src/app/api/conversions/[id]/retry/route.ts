import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { Upload } from "@/lib/db/models/Upload";
import { getStorage } from "@/lib/storage";
import { enqueueConversionJob } from "@/lib/queue/conversion-queue";
import { transitionJobState } from "@/lib/jobs/state-machine";
import { errorResponse } from "@/lib/errors";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(
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

    if (job.status !== "failed" && job.status !== "cancelled") {
      return errorResponse(
        "INVALID_STATE",
        `Only failed or cancelled jobs can be retried. Current status is '${job.status}'.`,
        409
      );
    }

    // Verify upload and physical file still exist in storage
    const upload = await Upload.findById(job.uploadId);
    if (!upload) {
      return errorResponse(
        "JOB_EXPIRED",
        "The source video upload has expired and must be uploaded again.",
        410
      );
    }

    const storage = getStorage();
    const inputPath = storage.getPath(upload.storageKey);
    if (!fs.existsSync(inputPath)) {
      return errorResponse(
        "JOB_EXPIRED",
        "The source video file has been removed from storage. Please select and upload the file again.",
        410
      );
    }

    // Max retry threshold
    if (job.attempt >= 5) {
      return errorResponse(
        "RATE_LIMITED",
        "Maximum retry attempts reached for this conversion.",
        429
      );
    }

    const newAttempt = (job.attempt || 1) + 1;

    // Atomically transition back to 'queued'
    const updatedJob = await transitionJobState(
      jobId,
      ["failed", "cancelled"],
      "queued",
      {
        attempt: newAttempt,
        progressPercent: 0,
        queuedAt: new Date(),
        cancelRequestedAt: undefined,
        errorCode: undefined,
        errorMessageSafe: undefined,
        startedAt: undefined,
        finishedAt: undefined,
      }
    );

    if (!updatedJob) {
      return errorResponse("INVALID_STATE", "Could not retry job. Please refresh and try again.", 409);
    }

    // Re-enqueue into BullMQ
    await enqueueConversionJob(jobId);

    return NextResponse.json({
      jobId: updatedJob._id.toString(),
      status: "queued",
      attempt: newAttempt,
      message: "Conversion job re-queued successfully.",
    });
  } catch (err: unknown) {
    console.error("Retry conversion error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retry conversion.", 500);
  }
}
