import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { getStorage } from "@/lib/storage";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
  jobIds: z.array(z.string()).min(1, "At least one job ID must be provided."),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid array of job IDs.", 400);
    }

    const { jobIds } = parsed.data;
    const storage = getStorage();

    const jobs = await ConversionJob.find({
      _id: { $in: jobIds },
      deletedAt: { $exists: false },
    });

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "No active jobs matched the selection.",
      });
    }

    // Delete output storage files
    for (const job of jobs) {
      if (job.output?.storageKey) {
        try {
          await storage.delete(job.output.storageKey);
        } catch {
          // Ignore individual storage file deletion errors
        }
      }
    }

    // Mark all as deleted
    await ConversionJob.updateMany(
      { _id: { $in: jobIds } },
      { $set: { deletedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      deletedCount: jobs.length,
      message: `Successfully deleted ${jobs.length} conversion(s).`,
    });
  } catch (err: unknown) {
    console.error("Bulk delete error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to delete selected conversions.", 500);
  }
}
