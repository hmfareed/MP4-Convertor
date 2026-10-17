import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { transitionJobState } from "@/lib/jobs/state-machine";
import { errorResponse } from "@/lib/errors";

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

    if (job.status === "completed") {
      return errorResponse(
        "INVALID_STATE",
        "Completed conversions cannot be cancelled.",
        409
      );
    }

    if (job.status === "cancelled") {
      return NextResponse.json({ message: "Job is already cancelled." });
    }

    if (job.status === "queued") {
      await transitionJobState(jobId, "queued", "cancelled", {
        cancelRequestedAt: new Date(),
        finishedAt: new Date(),
      });
      return NextResponse.json({ message: "Queued conversion cancelled successfully." });
    }

    if (job.status === "processing") {
      await ConversionJob.updateOne(
        { _id: jobId },
        { $set: { cancelRequestedAt: new Date() } }
      );
      return NextResponse.json({
        message: "Cancellation requested. Worker will terminate processing.",
      });
    }

    return errorResponse(
      "INVALID_STATE",
      `Cannot cancel job in '${job.status}' state.`,
      409
    );
  } catch (err: unknown) {
    console.error("Cancel conversion error:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to cancel conversion.",
      500
    );
  }
}
