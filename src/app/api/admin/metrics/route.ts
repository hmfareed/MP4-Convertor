import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { User } from "@/lib/db/models/User";
import { getConversionQueue } from "@/lib/queue/conversion-queue";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/admin";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    await requireAdmin();

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      cancelledJobs,
      activeJobs,
      totalUsers,
    ] = await Promise.all([
      ConversionJob.countDocuments(),
      ConversionJob.countDocuments({ status: "completed" }),
      ConversionJob.countDocuments({ status: "failed" }),
      ConversionJob.countDocuments({ status: "cancelled" }),
      ConversionJob.countDocuments({ status: { $in: ["queued", "processing"] } }),
      User.countDocuments(),
    ]);

    // BullMQ live queue counts
    let queueWaiting = 0;
    let queueActive = 0;
    try {
      const queue = getConversionQueue();
      queueWaiting = await queue.getWaitingCount();
      queueActive = await queue.getActiveCount();
    } catch {
      // Redis might be unavailable in some test runs
    }

    // Average processing time calculation
    const avgStats = await ConversionJob.aggregate([
      { $match: { status: "completed", processingMs: { $gt: 0 } } },
      { $group: { _id: null, avgMs: { $avg: "$processingMs" } } },
    ]);
    const avgProcessingMs = avgStats.length > 0 ? Math.round(avgStats[0].avgMs) : 0;

    // Storage calculation
    const storageStats = await ConversionJob.aggregate([
      {
        $group: {
          _id: null,
          totalOutputBytes: { $sum: "$output.sizeBytes" },
          totalInputBytes: { $sum: "$fileSizeBytes" },
        },
      },
    ]);
    const totalStorageBytes =
      storageStats.length > 0
        ? (storageStats[0].totalOutputBytes || 0) + (storageStats[0].totalInputBytes || 0)
        : 0;

    return NextResponse.json({
      metrics: {
        totalJobs,
        completedJobs,
        failedJobs,
        cancelledJobs,
        activeJobs,
        totalUsers,
        queueWaiting,
        queueActive,
        avgProcessingSec: Math.round(avgProcessingMs / 100) / 10,
        totalStorageBytes,
        successRate:
          totalJobs > 0
            ? Math.round((completedJobs / totalJobs) * 100)
            : 100,
      },
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("UNAUTHENTICATED", err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("FORBIDDEN", err.message, 403);
    }
    console.error("Admin metrics error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retrieve admin metrics.", 500);
  }
}
