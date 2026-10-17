import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/admin";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

    const filter: Record<string, unknown> = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { originalFilename: { $regex: search, $options: "i" } },
        { "output.filename": { $regex: search, $options: "i" } },
        { _id: search.length === 24 ? search : undefined },
      ].filter(Boolean);
    }

    const jobs = await ConversionJob.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = jobs.map((j) => ({
      id: j._id.toString(),
      ownerType: j.ownerType,
      originalFilename: j.originalFilename,
      outputFilename: j.output?.filename,
      sizeBytes: j.fileSizeBytes,
      outputSizeBytes: j.output?.sizeBytes,
      durationSec: j.output?.durationSec,
      bitrateKbps: j.settings.bitrateKbps,
      status: j.status,
      attempt: j.attempt,
      progress: j.progressPercent,
      errorCode: j.errorCode,
      errorMessage: j.errorMessageSafe,
      processingMs: j.processingMs,
      createdAt: j.createdAt,
      finishedAt: j.finishedAt,
    }));

    return NextResponse.json({ jobs: formatted });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("UNAUTHENTICATED", err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("FORBIDDEN", err.message, 403);
    }
    console.error("Admin jobs error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retrieve jobs list.", 500);
  }
}
