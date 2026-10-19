import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();
    const token = params.token;

    // Find by shareToken, or fallback to _id
    const job = await ConversionJob.findOne({
      $or: [{ shareToken: token }, { _id: token.match(/^[0-9a-fA-F]{24}$/) ? token : null }],
    });

    if (!job) {
      return errorResponse("NOT_FOUND", "Shared conversion was not found or has expired.", 404);
    }

    if (job.status === "expired" || (job.expiresAt && new Date() > new Date(job.expiresAt))) {
      return errorResponse(
        "EXPIRED",
        "This shared audio file has expired in accordance with data retention policy.",
        410
      );
    }

    if (job.status !== "completed" || !job.output?.storageKey) {
      return errorResponse(
        "NOT_READY",
        "This conversion is still processing or was not completed.",
        400
      );
    }

    return NextResponse.json({
      id: job._id.toString(),
      filename: job.output.filename,
      sizeBytes: job.output.sizeBytes,
      durationSec: job.output.durationSec,
      format: job.output.format || job.settings.format || "mp3",
      bitrateKbps: job.output.bitrateKbps || job.settings.bitrateKbps,
      title: job.settings.metadata?.title || job.output.filename.replace(/\.[^/.]+$/, ""),
      artist: job.settings.metadata?.artist,
      album: job.settings.metadata?.album,
      expiresAt: job.expiresAt,
      previewUrl: `/api/share/${token}/preview`,
      downloadUrl: `/api/share/${token}/download`,
    });
  } catch (err) {
    console.error("Share endpoint error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retrieve shared audio information.", 500);
  }
}
