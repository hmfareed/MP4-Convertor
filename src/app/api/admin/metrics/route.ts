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

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);
    fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      cancelledJobs,
      activeJobs,
      recentJobs24h,
      totalUsers,
      activeUsers,
      newUsersToday,
      rawDailyUsers,
      recentJobsDocs,
    ] = await Promise.all([
      ConversionJob.countDocuments(),
      ConversionJob.countDocuments({ status: "completed" }),
      ConversionJob.countDocuments({ status: "failed" }),
      ConversionJob.countDocuments({ status: "cancelled" }),
      ConversionJob.countDocuments({ status: { $in: ["queued", "processing"] } }),
      ConversionJob.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: fourteenDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            count: { $sum: 1 },
          },
        },
      ]),
      ConversionJob.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id originalFilename status settings output createdAt"),
    ]);

    // Build complete continuous daily series for the last 14 days
    const dailyMap = new Map<string, number>();
    rawDailyUsers.forEach((item: { _id: string; count: number }) => {
      if (item._id) dailyMap.set(item._id, item.count);
    });

    const usersPerDay: Array<{ date: string; label: string; count: number }> = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      usersPerDay.push({
        date: dateStr,
        label,
        count: dailyMap.get(dateStr) || 0,
      });
    }

    const recentJobs = recentJobsDocs.map((j) => ({
      id: j._id.toString(),
      originalFilename: j.originalFilename,
      status: j.status,
      bitrateKbps: j.settings?.bitrateKbps ?? 192,
      durationSec: j.output?.durationSec,
      createdAt: j.createdAt.toISOString(),
    }));

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
        recentJobs24h,
        totalUsers,
        activeUsers,
        newUsersToday,
        queueWaiting,
        queueActive,
        avgProcessingSec: Math.round(avgProcessingMs / 100) / 10,
        totalStorageBytes,
        successRate:
          totalJobs > 0
            ? Math.round((completedJobs / totalJobs) * 100)
            : 100,
        usersPerDay,
        recentJobs,
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
