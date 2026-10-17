import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/admin";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // e.g. "2026-10-15"
    const monthParam = searchParams.get("month"); // e.g. "2026-10"

    const responseData: Record<string, unknown> = {};

    // 1. If dateParam provided (YYYY-MM-DD), query that specific day
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [year, month, day] = dateParam.split("-").map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      const [count, totalToDate, recentUsers] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
        User.countDocuments({ createdAt: { $lte: endOfDay } }),
        User.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
          .select("name email role status createdAt")
          .limit(10)
          .lean(),
      ]);

      responseData.dateStats = {
        date: dateParam,
        count,
        totalToDate,
        users: recentUsers.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        })),
      };
    }

    // 2. If monthParam provided (YYYY-MM), query daily counts for that month
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const dailyAgg = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            count: { $sum: 1 },
          },
        },
      ]);

      const dailyCounts: Record<string, number> = {};
      let totalInMonth = 0;
      dailyAgg.forEach((item: { _id: string; count: number }) => {
        if (item._id) {
          dailyCounts[item._id] = item.count;
          totalInMonth += item.count;
        }
      });

      responseData.monthStats = {
        month: monthParam,
        dailyCounts,
        totalInMonth,
      };
    }

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("UNAUTHENTICATED", err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("FORBIDDEN", err.message, 403);
    }
    console.error("Admin user stats error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to retrieve user statistics.", 500);
  }
}
