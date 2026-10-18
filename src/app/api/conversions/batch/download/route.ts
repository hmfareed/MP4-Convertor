import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { ConversionJob } from "@/lib/db/models/ConversionJob";
import { getStorage } from "@/lib/storage";
import { errorResponse } from "@/lib/errors";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import fs from "fs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const batchDownloadSchema = z.object({
  jobIds: z.array(z.string()).min(1, "At least one job ID must be provided."),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const parsed = batchDownloadSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", "Please provide a valid list of job IDs.", 400);
    }

    const { jobIds } = parsed.data;

    const completedJobs = await ConversionJob.find({
      _id: { $in: jobIds },
      status: "completed",
      "output.storageKey": { $exists: true },
      deletedAt: { $exists: false },
    });

    if (completedJobs.length === 0) {
      return errorResponse(
        "NOT_FOUND",
        "No completed conversions available for the requested jobs.",
        404
      );
    }

    const storage = getStorage();
    const passThrough = new PassThrough();
    const archive = new ZipArchive({
      zlib: { level: 6 },
    });

    archive.on("error", (err: Error) => {
      console.error("ZIP archiver error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    const seenNames = new Set<string>();

    for (const job of completedJobs) {
      if (!job.output?.storageKey) continue;
      const filePath = storage.getPath(job.output.storageKey);

      if (fs.existsSync(filePath)) {
        let baseName = job.output.filename || `${job.originalFilename.replace(/\.[^/.]+$/, "")}.mp3`;
        let finalName = baseName;
        let counter = 1;

        while (seenNames.has(finalName.toLowerCase())) {
          const extIdx = baseName.lastIndexOf(".");
          const namePart = extIdx !== -1 ? baseName.substring(0, extIdx) : baseName;
          const extPart = extIdx !== -1 ? baseName.substring(extIdx) : ".mp3";
          finalName = `${namePart}-${counter}${extPart}`;
          counter++;
        }

        seenNames.add(finalName.toLowerCase());
        archive.file(filePath, { name: finalName });
      }
    }

    archive.finalize();

    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
      cancel() {
        passThrough.destroy();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="selected-audio-conversions.zip"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Multi-job ZIP download error:", err);
    return errorResponse("INTERNAL_ERROR", "Failed to package selected conversions ZIP.", 500);
  }
}
